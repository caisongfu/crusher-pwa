# Day 5 复制格式 + 积分 UI + 支付架构设计文档

> 日期：2026-03-05
> 阶段：Day 5 / 9天开发路线图
> 验收标准：复制功能正常，管理员可手动充值

## 目标

实现三格式复制功能，完成积分余额动态展示，建立支付抽象层（MVP：手动充值 + PayPal 说明），实现管理员手动积分管理。

## 三格式复制

### lib/copy.ts

```typescript
// Markdown 原文复制
export async function copyAsMarkdown(markdown: string): Promise<void>

// 纯文本（去除所有 Markdown 标记）
export async function copyAsPlainText(markdown: string): Promise<void>

// 富文本（HTML + 纯文本，支持 Word/企业微信）
export async function copyAsRichText(markdown: string): Promise<void>
// 使用 marked 转 HTML，ClipboardItem({ 'text/html', 'text/plain' })
// 不支持时降级为 copyAsPlainText + toast 提示
```

### CopyButtons 组件

```
[📋 Markdown]  [📄 纯文本]  [✨ 富文本]
```

- 点击后按钮短暂变为 `✅ 已复制`（0.5s）
- 嵌入 InsightResult 底部（Day 4 组件扩展）
- 非 HTTPS 环境：富文本按钮显示 tooltip "需要 HTTPS 环境"

## 积分余额动态化

Day 2 建立的 `CreditBadge` 升级为动态：

```
Layout 服务端 → 获取 profile.credits → Zustand auth store
AI 分析完成 → onFinish → store.updateCredits(newBalance)
充值成功 → store.updateCredits(newBalance)（Day 7+ 实现）
```

顶部栏始终显示最新余额，无需重新加载页面。

## Profile 页（Day 5 实现）

```
tabs: [账户信息] [积分 & 充值] [消费记录]

── 积分 & 充值 Tab ──────────────────────
当前余额：85 积分

套餐选择：
┌──────────┐ ┌──────────┐ ┌──────────┐
│  入门包   │ │  标准包   │ │  专业包   │
│ 100 积分  │ │ 500 积分  │ │1200 积分  │
│   ¥10    │ │   ¥45    │ │   ¥96    │
└──────────┘ └──────────┘ └──────────┘

[点击任意套餐 → 弹出 Modal]

── 消费记录 Tab ──────────────────────────
时间    类型          金额    余额
AI分析  -15积分   consumed  85
充值    +100积分  manual_grant  100
```

### 充值 Modal（暂不可用）

```
支付功能开发中

如需充值，请通过以下方式：
📧 PayPal: PayPal.Me/SoulfulCai
💰 金额：选择套餐对应金额
📝 备注：您的注册邮箱

完成后请联系管理员充值积分。

[关闭]
```

## 支付抽象层

### 接口定义

```typescript
// src/lib/payment/types.ts
export interface PaymentProvider {
  name: string
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>
  verifyCallback(body: string, signature: string): boolean
  parseCallback(body: string): CallbackData
}

export interface CreateOrderParams {
  userId: string
  packageName: PackageName
  amountFen: number
  creditsGranted: number
}

export interface CreateOrderResult {
  orderId: string
  paymentUrl?: string       // 自动支付
  instructions?: string     // 手动支付说明
}
```

### Provider 实现

```
src/lib/payment/providers/
  manual.ts      ← ManualPaymentProvider（返回 PayPal 说明，MVP 使用）
  hupijiao.ts    ← HupijiaoProvider（throw NotImplemented，预留）
  alipay.ts      ← AlipayProvider（throw NotImplemented，预留）
  paypal.ts      ← PayPalProvider（throw NotImplemented，预留）
```

### API 路由

```
POST /api/payment/create
  → getPaymentProvider()（从 PAYMENT_PROVIDER 环境变量）
  → provider.createOrder()
  → 保存订单记录到 payment_orders 表
  → 返回 { orderId, instructions }

POST /api/payment/webhook（预留框架）
  → provider.verifyCallback() 验证签名
  → 幂等检查（已处理的订单不重复充值）
  → grantCreditsFromPayment()（待实现）
```

## 管理员手动积分管理

### API 路由

```
POST /api/admin/credits
  Body: { userId: string, amount: number, description: string }
  验证：auth.uid() 对应 profile.role = 'admin'
  执行：
    1. 获取用户当前积分
    2. UPDATE profiles SET credits = credits + amount
    3. INSERT credit_transactions（type 根据 amount 正负判断）
    4. 返回：{ newBalance }

GET /api/admin/users
  返回用户列表（含积分余额）支持邮箱搜索 + 分页
```

### Admin 用户详情页（/admin/users/[id]）

```
用户基本信息（邮箱、注册时间、角色）

当前积分余额：85 积分

手动调整积分：
  金额：[+100] / [-50] / 自定义输入
  备注：（必填，最多 200 字）
  [充值] [扣减]

──── 该用户积分流水 ────────────────
时间    类型          金额    操作人
...
```

## 验收标准

- [ ] 三格式复制均正常（富文本在支持 ClipboardItem 的浏览器）
- [ ] 积分余额在 AI 分析后实时更新（不需刷新页面）
- [ ] Profile → 积分 & 充值 Tab 正确展示套餐 + Modal 说明
- [ ] 消费记录列表正确显示历史流水
- [ ] 管理员通过 /admin/users/[id] 可手动充值/扣减积分
- [ ] 充值/扣减后 credit_transactions 表有记录
