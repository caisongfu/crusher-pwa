# Day 7 代码审查优化实施计划

**目标：** 实现代码审查报告中提出的优化建议，提升代码质量、性能和用户体验

**基于：** `docs/reviews/20260306-day7-module6-code-review.md`

---

## 短期优化任务（1-2 天）

### Task 1: 执行数据库迁移

**优先级：** 🔴 高（基础设施）

**文件：**
- `migrations/20260306_refund_transaction_optimization.sql`

**内容：**
- PostgreSQL RPC 函数 `refund_order()` 用于事务处理
- 8 个数据库索引优化查询性能

**验证步骤：**
```bash
# 执行迁移
psql -h db.xxx.supabase.co -U postgres -d postgres -f migrations/20260306_refund_transaction_optimization.sql

# 验证函数创建
\df refund_order

# 验证索引
\di idx_payment_orders_status_created_at
```

---

### Task 2: 为退款请求列表添加分页

**优先级：** 🟠 中（性能优化）

**文件：**
- Update: `src/app/api/admin/refunds/route.ts`

**功能：**
- 添加分页参数（page, limit）
- 返回总数和分页信息
- 使用常量中的分页配置

**验证步骤：**
```bash
# 测试分页
curl "http://localhost:3000/api/admin/refunds?page=1&limit=20"

# 验证返回格式包含 total, page, limit
```

---

### Task 3: 实现邮件发送功能

**优先级：** 🟡 中（用户体验）

**文件：**
- Create: `src/lib/email/resend.ts`（或 sendgrid.ts）
- Update: `src/app/api/admin/refunds/[id]/approve/route.ts`

**功能：**
- 集成 Resend/SendGrid 邮件服务
- 退款批准/拒绝时发送邮件通知
- 包含退款原因、订单详情等信息

**环境变量：**
```env
RESEND_API_KEY=re_...
```

**验证步骤：**
```bash
# 测试邮件发送（需要真实邮箱）
# 在退款审批 API 中测试
```

---

## 中期优化任务（1 周内）

### Task 4: 实现统计数据缓存机制

**优先级：** 🟠 中（性能优化）

**文件：**
- Update: `src/app/api/admin/stats/route.ts`
- Create: `src/lib/cache/redis.ts`（或使用 Supabase 缓存）

**功能：**
- 使用 Redis 缓存统计数据
- TTL: 5-10 分钟
- 日期范围变化时失效缓存

**验证步骤：**
```bash
# 第一次查询
curl "http://localhost:3000/api/admin/stats"

# 第二次查询（应该更快）
curl "http://localhost:3000/api/admin/stats"
```

---

### Task 5: 添加请求 ID 跟踪和日志

**优先级：** 🟡 中（可观测性）

**文件：**
- Create: `src/lib/logger/index.ts`
- Update: 所有 API 路由文件

**功能：**
- 生成唯一请求 ID（UUID）
- 在所有日志中包含请求 ID、用户 ID
- 统一日志格式

**验证步骤：**
```bash
# 查看日志输出，确认包含 request-id 和 user-id
```

---

### Task 6: 为订单列表行组件使用 React.memo

**优先级：** 🟢 低（性能优化）

**文件：**
- Update: `src/components/admin/order-list.tsx`

**功能：**
- 提取订单行组件
- 使用 React.memo 避免不必要的重新渲染

**验证步骤：**
```bash
# 使用 React DevTools Profiler 验证渲染次数减少
```

---

## 长期优化任务（可选）

### Task 7: 添加 API 响应类型定义

**优先级：** 🟢 低（类型安全）

**文件：**
- Update: `src/types/index.ts`
- Update: 所有 API 路由

**功能：**
- 定义 `ApiResponse<T>` 泛型接口
- 统一 API 响应格式

---

### Task 8: 添加 OpenAPI 文档

**优先级：** 🟢 低（开发体验）

**文件：**
- Create: `docs/api/openapi.yaml`

**功能：**
- 使用 Swagger/OpenAPI 规范
- 描述所有 API 端点

---

### Task 9: 添加单元测试

**优先级：** 🟢 低（代码质量）

**文件：**
- Create: `src/lib/admin/__tests__/auth.test.ts`
- Create: `src/lib/format/__tests__/index.test.ts`

**功能：**
- 测试工具函数
- 测试权限验证逻辑

---

## 执行顺序

### 第一批（立即执行）
1. Task 1: 执行数据库迁移
2. Task 2: 为退款请求列表添加分页
3. Task 3: 实现邮件发送功能

### 第二批（短期执行）
4. Task 4: 实现统计数据缓存机制
5. Task 5: 添加请求 ID 跟踪和日志
6. Task 6: 为订单列表行组件使用 React.memo

### 第三批（长期可选）
7. Task 7: 添加 API 响应类型定义
8. Task 8: 添加 OpenAPI 文档
9. Task 9: 添加单元测试

---

## 验收标准

### 短期任务验收
- [ ] 数据库迁移成功执行，函数和索引创建完成
- [ ] 退款请求列表支持分页，性能提升
- [ ] 邮件发送功能正常工作

### 中期任务验收
- [ ] 统计数据使用缓存，响应时间 < 50ms
- [ ] 所有日志包含请求 ID 和用户 ID
- [ ] 订单列表行组件减少不必要的渲染

### 长期任务验收
- [ ] API 响应有统一的类型定义
- [ ] OpenAPI 文档完整
- [ ] 核心工具函数有单元测试覆盖

---

## 安全注意事项

1. **数据库迁移：** 在生产环境执行前先在测试环境验证
2. **邮件发送：** 保护 API 密钥，不要在日志中泄露
3. **缓存：** 敏感数据不缓存，设置合理的 TTL
4. **日志：** 不记录敏感信息（密码、token）

---

## 性能目标

- 订单查询 < 200ms（分页查询）
- 统计数据 < 50ms（使用缓存）
- 退款审批 < 500ms（事务处理）
