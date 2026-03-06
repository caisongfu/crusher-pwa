# 数据库迁移执行指南

## 迁移文件

`supabase/migrations/20260306_refund_transaction_optimization.sql`

## 迁移内容

### 1. refund_order() RPC 函数
用于退款审批的事务处理，确保数据一致性：
- 行级锁定（FOR UPDATE）
- 验证审批人不是申请人
- 自动回退积分
- 更新订单状态
- 记录积分交易流水

### 2. 数据库索引优化
添加以下索引以提升查询性能：
- `idx_payment_orders_status_created_at` - 订单查询
- `idx_payment_orders_user_id` - 用户订单查询
- `idx_payment_orders_out_trade_no` - 订单号查询
- `idx_refund_requests_status` - 退款请求状态筛选
- `idx_refund_requests_order_id` - 退款订单关联
- `idx_refund_requests_created_at` - 退款请求时间排序
- `idx_credit_transactions_user_id` - 用户积分流水查询
- `idx_credit_transactions_created_at` - 积分流水时间排序

## 执行方法

### 方法 1：使用 Supabase Dashboard（推荐）

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 SQL Editor
4. 复制 `supabase/migrations/20260306_refund_transaction_optimization.sql` 的内容
5. 点击 "Run" 执行

### 方法 2：使用 psql 命令行

```bash
# 从环境变量获取数据库连接信息
export DB_HOST=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d'/' -f3)
export DB_NAME=postgres
export DB_USER=postgres

# 执行迁移（需要输入密码）
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f supabase/migrations/20260306_refund_transaction_optimization.sql
```

### 方法 3：使用 Supabase CLI（如果已配置）

```bash
# 推送到远程数据库
supabase db push

# 或者重置并应用所有迁移（谨慎使用）
supabase db reset
```

## 验证迁移

执行迁移后，使用以下 SQL 验证：

```sql
-- 验证函数创建
\df refund_order

-- 应该看到：
-- refund_order(uuid, uuid, text, text) | jsonb | func

-- 验证索引创建
\di idx_payment_orders_status_created_at
\di idx_refund_requests_status
\di idx_credit_transactions_user_id

-- 应该看到所有 8 个索引
```

## 回滚

如果需要回滚此迁移：

```sql
-- 删除函数
DROP FUNCTION IF EXISTS refund_order(UUID, UUID, TEXT, TEXT);

-- 删除索引
DROP INDEX IF EXISTS idx_payment_orders_status_created_at;
DROP INDEX IF EXISTS idx_payment_orders_user_id;
DROP INDEX IF EXISTS idx_payment_orders_out_trade_no;
DROP INDEX IF EXISTS idx_refund_requests_status;
DROP INDEX IF EXISTS idx_refund_requests_order_id;
DROP INDEX IF EXISTS idx_refund_requests_created_at;
DROP INDEX IF EXISTS idx_credit_transactions_user_id;
DROP INDEX IF EXISTS idx_credit_transactions_created_at;
```

## 注意事项

⚠️ **重要提示**：
1. 在生产环境执行前，先在测试环境验证
2. 执行前备份数据库
3. 在低峰期执行，避免影响用户体验
4. 执行后监控系统性能和错误日志

## 性能影响

迁移执行后，预期性能提升：
- 订单列表查询：10-100 倍提升（数据量大时）
- 退款请求查询：5-20 倍提升
- 积分流水查询：10-50 倍提升

## 相关文档

- 代码审查报告：`docs/reviews/20260306-day7-module6-code-review.md`
- 优化实施计划：`docs/plans/20260306-code-review-optimizations.md`
