# Day 1 基础设施设计文档

> 日期：2026-03-05
> 阶段：Day 1 / 9天开发路线图
> 验收标准：可注册登录，数据库就绪

## 目标

搭建项目的完整数据库 schema、认证系统和路由保护中间件，为后续所有功能模块提供稳固基础。

## 实施方案

**选定方案：Migration 文件优先**

使用 Supabase CLI 管理数据库迁移，所有 schema 变更通过 SQL 文件版本控制。

## 任务清单

### 1. Supabase 数据库迁移文件（4个文件）

| 文件 | 内容 |
|------|------|
| `001_initial_schema.sql` | 建表：profiles / documents / insights / custom_lenses |
| `002_credit_payment.sql` | 建表：credit_transactions / payment_orders |
| `003_rls_policies.sql` | 所有表的 Row Level Security 策略 |
| `004_functions_indexes.sql` | `deduct_credits()` 原子函数 + 所有索引 |

### 2. 扩展表（管理后台用）

| 表 | 用途 |
|----|------|
| `feedbacks` | 用户反馈/投诉/Bug 报告 |
| `system_prompts` | Prompt 版本管理（数据库驱动） |
| `announcements` | 系统公告 |

> 一次建齐，避免后续 ALTER TABLE 破坏 RLS 策略。

### 3. 类型系统对齐

更新 `src/types/index.ts`，使类型定义与 PROJECT.md 数据库 schema 完全对齐：
- `Profile.id` → 直接引用 `auth.users.id`（去掉 `user_id` 字段）
- `Document.raw_content` → 对齐字段名
- `CreditTransaction.type` → 使用 PROJECT.md 定义的枚举值
- `Feedback.type` → 增加 `payment` 类型

### 4. Supabase Server 客户端

更新 `src/lib/supabase/server.ts`，使用最新的 `@supabase/ssr` 包（替换已弃用的 `auth-helpers-nextjs`）。

### 5. Middleware

实现 `src/middleware.ts`：
- 解析 JWT，验证用户身份
- 未登录用户重定向至 `/login`
- `/admin/*` 路由额外验证 `role = 'admin'`
- 白名单：`/login`、`/register`、`/api/payment/webhook`

## 技术细节

- Supabase 使用 `@supabase/ssr` 包（`auth-helpers-nextjs` 已弃用）
- Middleware 使用 `createServerClient` + cookie 方式管理 Session
- RLS 策略使用 `auth.uid()` 匹配用户数据
- Admin 检查：`EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`

## 验收标准

- [ ] 所有表在 Supabase 中创建成功
- [ ] RLS 策略生效（非本人数据不可访问）
- [ ] `deduct_credits()` 函数存在
- [ ] 可注册新用户，`profiles` 表自动创建记录
- [ ] 登录后可访问主应用路由
- [ ] 未登录访问 `/` 自动跳转 `/login`
- [ ] 非 admin 访问 `/admin` 返回 403 或重定向
