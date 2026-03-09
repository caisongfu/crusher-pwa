# 用量统计数据准确性问题 - 总结

## 问题发现

✅ **已定位问题根本原因**

用户注册了新用户，但统计页面显示"新增用户为0"，所有统计数据（3月1日至今）都显示为0。

## 根本原因

数据库函数 `update_daily_stats` 存在**类型转换错误**:

```sql
-- 错误代码 (在 20260307_daily_stats_new_fields.sql 中)
COALESCE((
  SELECT json_object_agg(lens_type, count)  -- 返回 json 类型
  FROM (...)
), '{}'::jsonb)  -- COALESCE 默认值是 jsonb 类型
```

**PostgreSQL 错误**: `COALESCE could not convert type jsonb to json` (错误码: 42846)

**影响**:
- ❌ `update_daily_stats` 函数执行失败
- ❌ `daily_stats` 表无数据
- ❌ 统计API返回全0数据
- ✅ 用户数据正常写入 `profiles`、`documents`、`insights` 等表

## 解决方案

### 修复内容

将 `json_object_agg` 改为 `jsonb_object_agg`，统一使用 `jsonb` 类型。

**修复文件**: `supabase/migrations/20260309_fix_daily_stats_type.sql`

### 应用步骤

1. **在 Supabase Dashboard 执行SQL**:
   - 打开 https://supabase.com/dashboard
   - 选择项目 > SQL Editor
   - 复制并执行 `supabase/migrations/20260309_fix_daily_stats_type.sql`

2. **验证修复**:
   ```bash
   npx tsx scripts/verify_stats_fix.ts
   ```

3. **刷新前端页面**，查看统计数据

## 数据准确性验证

通过 `scripts/check_db_data.ts` 验证，数据库中确实有真实数据:

```
总用户数: 4
今日新增用户数: 1  ✅
```

修复后，所有统计指标都将准确计算:

- ✅ **新增用户** (new_users): 按 `created_at` 统计当日注册用户
- ✅ **订单数** (orders_count): 按 `paid_at` 统计当日支付成功订单
- ✅ **收入** (total_revenue_fen): 按 `paid_at` 统计当日收入
- ✅ **活跃用户** (active_users): 统计当日创建过分析的用户
- ✅ **积分消耗** (total_credits_consumed): 统计当日消耗的积分
- ✅ **Token用量** (total_input_tokens, total_output_tokens): 统计当日token用量

## 相关文档

- 详细分析报告: [docs/bug/stats_accuracy_issue.md](../docs/bug/stats_accuracy_issue.md)
- 修复指南: [scripts/README.md](../scripts/README.md)
- 修复SQL: [supabase/migrations/20260309_fix_daily_stats_type.sql](../supabase/migrations/20260309_fix_daily_stats_type.sql)

## 验证脚本

- `scripts/check_db_data.ts` - 检查数据库原始数据和问题诊断
- `scripts/verify_stats_fix.ts` - 验证修复是否成功

## 下一步

请按照 [scripts/README.md](../scripts/README.md) 中的步骤应用修复，然后运行验证脚本确认问题已解决。
