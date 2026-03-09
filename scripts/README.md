# 统计功能修复指南

## 问题概述

用量统计模块显示所有数据为0，根本原因是数据库函数 `update_daily_stats` 中存在类型转换错误（`json` vs `jsonb`），导致函数执行失败。

详细分析见: [docs/bug/stats_accuracy_issue.md](../bug/stats_accuracy_issue.md)

## 快速修复步骤

### 1. 在 Supabase 执行修复SQL

打开 [Supabase Dashboard](https://supabase.com/dashboard) > 选择项目 > SQL Editor，执行以下SQL:

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
      SELECT jsonb_object_agg(lens_type, count)
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

或者直接复制文件内容:
```bash
cat supabase/migrations/20260309_fix_daily_stats_type.sql
```

### 2. 验证修复

执行验证脚本:

```bash
npx tsx scripts/verify_stats_fix.ts
```

预期输出:
```
=== 验证统计功能修复 ===

1. 调用 update_daily_stats 函数...
   ✅ 调用成功

2. 查询今日统计数据...
   ✅ 查询成功

今日统计数据:
────────────────────────────────────────────────────────────
日期: 2026-03-09
新增用户: 1
活跃用户: 0
总用户数: 4
订单数: 0
收入(分): 0
积分消耗: 0
输入Token: 0
输出Token: 0
透镜分布: {}
────────────────────────────────────────────────────────────

3. 验证数据准确性...
   ✅ 新增用户数准确: 1
   ✅ 活跃用户数准确: 0

✅ 验证完成！统计功能已修复。
```

### 3. 刷新前端页面

访问管理后台统计页面，应该能看到正确的数据。

## 核心修改

**修改前** (错误):
```sql
SELECT json_object_agg(lens_type, count)  -- 返回 json 类型
```

**修改后** (正确):
```sql
SELECT jsonb_object_agg(lens_type, count)  -- 返回 jsonb 类型
```

这样就与表字段 `lens_distribution JSONB` 的类型一致了。

## 相关脚本

- `scripts/check_db_data.ts` - 检查数据库原始数据
- `scripts/verify_stats_fix.ts` - 验证修复是否成功
- `scripts/fix_and_test.ts` - 交互式修复和测试

## 故障排查

如果验证失败，检查:

1. **SQL是否执行成功**: 在 Supabase SQL Editor 中应该看到 "Success. No rows returned"
2. **函数是否存在**: 执行 `SELECT proname FROM pg_proc WHERE proname = 'update_daily_stats';`
3. **表结构是否正确**: 执行 `\d daily_stats` 查看字段类型
4. **权限是否正确**: 确保使用的是 `SUPABASE_SERVICE_ROLE_KEY`

## 后续优化建议

1. 添加数据库函数的自动化测试
2. 监控 `daily_stats` 表的更新频率
3. 考虑使用 Supabase 的 Database Webhooks 自动触发统计更新
