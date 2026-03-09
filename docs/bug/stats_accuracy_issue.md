# 用量统计数据准确性问题分析报告

## 问题描述

用户反馈：注册了新用户，但统计页面显示"新增用户为0"，且3月1日至今的所有统计数据都是0。

## 问题排查过程

### 1. 数据库实际数据验证

通过脚本 `scripts/check_db_data.ts` 查询数据库，发现：

```
=== 检查 profiles 表 ===
总用户数: 4
今日新增用户数: 1  ✅ 数据库中确实有今日新增用户

=== 检查 daily_stats 表 ===
最近7天统计记录数: 0  ❌ 统计表为空

=== 手动调用 update_daily_stats ===
调用失败: {
  code: '42846',
  message: 'COALESCE could not convert type jsonb to json'
}  ❌ 函数执行失败
```

**结论**: 数据库中有真实数据，但统计函数执行失败，导致 `daily_stats` 表为空。

### 2. 根本原因分析

查看数据库函数 `update_daily_stats` 的定义（位于多个migration文件中），发现类型不匹配问题：

**问题代码** (在 `20260307_daily_stats_new_fields.sql` 第27-34行):
```sql
COALESCE((
  SELECT json_object_agg(lens_type, count)  -- 返回 json 类型
  FROM (...)
), '{}'::jsonb)  -- COALESCE 默认值是 jsonb 类型
```

**表结构** (在 `20260306_day7_refund_stats.sql` 第24行):
```sql
lens_distribution JSONB DEFAULT '{}'
```

**冲突点**:
- `json_object_agg()` 返回 `json` 类型
- 表字段 `lens_distribution` 是 `jsonb` 类型
- `COALESCE` 尝试将 `jsonb` 转换为 `json` 时失败

PostgreSQL 错误码 `42846` 表示类型转换失败。

### 3. 影响范围

- ✅ 用户注册、登录、文档创建等功能正常
- ✅ 数据正常写入 `profiles`、`documents`、`insights` 等表
- ❌ 统计API (`/api/admin/stats`) 调用 `update_daily_stats` 失败
- ❌ `daily_stats` 表无数据，导致前端显示全0

## 解决方案

### 修复方法

将 `json_object_agg` 改为 `jsonb_object_agg`，统一使用 `jsonb` 类型。

**修复后的函数** (已保存在 `supabase/migrations/20260309_fix_daily_stats_type.sql`):

```sql
CREATE OR REPLACE FUNCTION update_daily_stats(p_date DATE DEFAULT CURRENT_DATE) RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_stats (
    date, total_users, new_users, active_users,
    total_insights, total_credits_consumed, total_revenue_fen,
    orders_count, total_input_tokens, total_output_tokens,
    lens_distribution
  )
  VALUES (
    p_date,
    (SELECT COUNT(*) FROM profiles WHERE created_at < p_date + INTERVAL '1 day'),
    (SELECT COUNT(*) FROM profiles WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'),
    (SELECT COUNT(DISTINCT user_id) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'),
    (SELECT COUNT(*) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'),
    COALESCE((SELECT SUM(credits_cost)  FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'), 0),
    COALESCE((SELECT SUM(amount_fen)    FROM payment_orders WHERE paid_at >= p_date AND paid_at < p_date + INTERVAL '1 day' AND status = 'paid'), 0),
    (SELECT COUNT(*) FROM payment_orders WHERE paid_at >= p_date AND paid_at < p_date + INTERVAL '1 day' AND status = 'paid'),
    COALESCE((SELECT SUM(input_tokens)  FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'), 0),
    COALESCE((SELECT SUM(output_tokens) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'), 0),
    COALESCE((
      SELECT jsonb_object_agg(lens_type, count)  -- 改为 jsonb_object_agg
      FROM (
        SELECT lens_type, COUNT(*) as count
        FROM insights
        WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'
        GROUP BY lens_type
      ) subquery
    ), '{}'::jsonb)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_users             = EXCLUDED.total_users,
    new_users               = EXCLUDED.new_users,
    active_users            = EXCLUDED.active_users,
    total_insights          = EXCLUDED.total_insights,
    total_credits_consumed  = EXCLUDED.total_credits_consumed,
    total_revenue_fen       = EXCLUDED.total_revenue_fen,
    orders_count            = EXCLUDED.orders_count,
    total_input_tokens      = EXCLUDED.total_input_tokens,
    total_output_tokens     = EXCLUDED.total_output_tokens,
    lens_distribution       = EXCLUDED.lens_distribution,
    updated_at              = NOW();
END;
$$ LANGUAGE plpgsql;
```

### 应用步骤

1. **在 Supabase Dashboard 执行修复SQL**:
   - 打开 https://supabase.com/dashboard
   - 选择项目 > SQL Editor
   - 复制并执行 `supabase/migrations/20260309_fix_daily_stats_type.sql` 中的SQL

2. **验证修复**:
   ```bash
   npx tsx scripts/check_db_data.ts
   ```
   应该看到 `update_daily_stats` 调用成功，且 `daily_stats` 表有数据。

3. **刷新前端页面**:
   - 重新访问管理后台统计页面
   - 应该能看到正确的统计数据

## 其他统计数据准确性检查

修复后，需要验证以下统计指标的准确性：

### ✅ 新增用户 (new_users)
- **计算逻辑**: `COUNT(*) FROM profiles WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'`
- **准确性**: ✅ 正确，按 `created_at` 统计当日注册用户

### ✅ 订单数 (orders_count)
- **计算逻辑**: `COUNT(*) FROM payment_orders WHERE paid_at >= p_date AND paid_at < p_date + INTERVAL '1 day' AND status = 'paid'`
- **准确性**: ✅ 正确，按 `paid_at` 统计当日支付成功的订单

### ✅ 收入 (total_revenue_fen)
- **计算逻辑**: `SUM(amount_fen) FROM payment_orders WHERE paid_at >= p_date AND paid_at < p_date + INTERVAL '1 day' AND status = 'paid'`
- **准确性**: ✅ 正确，按 `paid_at` 统计当日收入

### ✅ 活跃用户 (active_users)
- **计算逻辑**: `COUNT(DISTINCT user_id) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'`
- **准确性**: ✅ 正确，统计当日创建过分析的用户数

### ✅ 积分消耗 (total_credits_consumed)
- **计算逻辑**: `SUM(credits_cost) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'`
- **准确性**: ✅ 正确，统计当日消耗的积分

### ✅ Token 用量 (total_input_tokens, total_output_tokens)
- **计算逻辑**: `SUM(input_tokens)` 和 `SUM(output_tokens) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'`
- **准确性**: ✅ 正确，统计当日的 token 用量

## 预防措施

为避免类似问题，建议：

1. **类型一致性检查**: 在 migration 中使用 `jsonb_object_agg` 而不是 `json_object_agg`
2. **自动化测试**: 添加数据库函数的集成测试
3. **监控告警**: 监控 `daily_stats` 表的更新频率，如果长时间无数据则告警

## 相关文件

- 问题函数定义: `supabase/migrations/20260307_daily_stats_new_fields.sql`
- 修复SQL: `supabase/migrations/20260309_fix_daily_stats_type.sql`
- 检查脚本: `scripts/check_db_data.ts`
- 统计API: `src/app/api/admin/stats/route.ts`
- 前端组件: `src/components/admin/stats-charts.tsx`
