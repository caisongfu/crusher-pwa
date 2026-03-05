# Day 5: Copy Formats + Credit UI + Payment Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement three-format copy functionality, dynamic credit balance display, payment abstraction layer (MVP: Manual + PayPal instructions), and admin manual credit management.

**Architecture:** All new utilities go under `src/lib/`, new components under `src/components/`, and API routes under `src/app/api/`. The payment layer uses a Provider interface pattern for extensibility — add new payment providers without touching business logic. Credit state is managed in a Zustand store so balance updates propagate everywhere without page reload.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Shadcn/UI, Zustand, Supabase, marked (for Markdown → HTML), Zod (validation), Lucide React

---

## Pre-flight Checks

Before starting, verify the existing codebase:

```bash
# Check what Day 4 left behind (may not be complete yet)
find src -name "*.tsx" -o -name "*.ts" | grep -v "ui/" | head -20
ls src/lib/
ls src/components/ 2>/dev/null || echo "No components yet"
```

Expected baseline:
- `src/middleware.ts` - JWT auth + admin role check ✅
- `src/lib/supabase/client.ts` + `server.ts` ✅
- `src/types/index.ts` - All types including `PACKAGES`, `CreditTransaction`, `PaymentOrder` ✅
- `src/components/ui/` - Shadcn UI primitives ✅
- `src/app/(auth)/` - Login/register pages ✅

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json` (via npm install)

### Step 1: Install marked for Markdown → HTML conversion

```bash
npm install marked
npm install --save-dev @types/marked
```

### Step 2: Verify installation

```bash
node -e "const { marked } = require('marked'); console.log(marked('**bold**'))"
```

Expected output: `<p><strong>bold</strong></p>\n`

### Step 3: Commit

```bash
git add package.json package-lock.json
git commit -m "chore: add marked for rich-text copy"
```

---

## Task 2: Create Copy Utilities (TDD)

**Files:**
- Create: `src/lib/copy.ts`
- Create: `src/__tests__/lib/copy.test.ts`

### Step 1: Create test file

```bash
mkdir -p src/__tests__/lib
```

Create `src/__tests__/lib/copy.test.ts`:

```typescript
import { stripMarkdown, markdownToHtml } from '@/lib/copy'

describe('stripMarkdown', () => {
  it('removes bold markers', () => {
    expect(stripMarkdown('**bold**')).toBe('bold')
  })

  it('removes italic markers', () => {
    expect(stripMarkdown('_italic_')).toBe('italic')
  })

  it('removes heading markers', () => {
    expect(stripMarkdown('# Heading')).toBe('Heading')
  })

  it('removes link syntax, keeps text', () => {
    expect(stripMarkdown('[text](url)')).toBe('text')
  })

  it('removes code backticks', () => {
    expect(stripMarkdown('`code`')).toBe('code')
  })

  it('removes list markers', () => {
    expect(stripMarkdown('- item')).toBe('item')
  })

  it('handles plain text unchanged', () => {
    expect(stripMarkdown('plain text')).toBe('plain text')
  })
})

describe('markdownToHtml', () => {
  it('converts bold to <strong>', async () => {
    const html = await markdownToHtml('**bold**')
    expect(html).toContain('<strong>bold</strong>')
  })

  it('converts heading to h1', async () => {
    const html = await markdownToHtml('# Title')
    expect(html).toContain('<h1>Title</h1>')
  })
})
```

### Step 2: Run tests to verify they fail

```bash
npx jest src/__tests__/lib/copy.test.ts 2>&1 | head -20
```

Expected: Error — cannot find module '@/lib/copy'

### Step 3: Create `src/lib/copy.ts`

```typescript
import { marked } from 'marked'

// 去除所有 Markdown 标记，保留纯文字
export function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')           // 标题
    .replace(/\*\*(.+?)\*\*/g, '$1')     // 粗体
    .replace(/\*(.+?)\*/g, '$1')         // 斜体
    .replace(/_(.+?)_/g, '$1')           // 斜体（下划线形式）
    .replace(/`{3}[\s\S]*?`{3}/g, '')    // 代码块
    .replace(/`(.+?)`/g, '$1')           // 行内代码
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // 链接
    .replace(/^[-*+]\s+/gm, '')          // 无序列表
    .replace(/^\d+\.\s+/gm, '')          // 有序列表
    .replace(/^>\s+/gm, '')              // 引用
    .replace(/!\[.*?\]\(.*?\)/g, '')     // 图片
    .replace(/\n{3,}/g, '\n\n')          // 多余空行
    .trim()
}

// Markdown 转 HTML（用于富文本复制）
export async function markdownToHtml(markdown: string): Promise<string> {
  return await marked(markdown)
}

// 复制 Markdown 原文
export async function copyAsMarkdown(markdown: string): Promise<void> {
  await navigator.clipboard.writeText(markdown)
}

// 复制纯文本（去除所有 Markdown 标记）
export async function copyAsPlainText(markdown: string): Promise<void> {
  await navigator.clipboard.writeText(stripMarkdown(markdown))
}

// 复制富文本（HTML + 纯文本，支持 Word/企业微信）
// 非 HTTPS 或不支持 ClipboardItem 时降级为纯文本
export async function copyAsRichText(markdown: string): Promise<void> {
  if (typeof ClipboardItem === 'undefined') {
    // 降级：复制纯文本
    await copyAsPlainText(markdown)
    return
  }

  const html = await markdownToHtml(markdown)
  const plain = stripMarkdown(markdown)

  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plain], { type: 'text/plain' }),
    }),
  ])
}
```

### Step 4: Run tests to verify they pass

```bash
npx jest src/__tests__/lib/copy.test.ts
```

Expected: All tests PASS

### Step 5: Commit

```bash
git add src/lib/copy.ts src/__tests__/lib/copy.test.ts
git commit -m "feat: add three-format copy utilities with tests"
```

---

## Task 3: Create CopyButtons Component

**Files:**
- Create: `src/components/copy-buttons.tsx`

### Step 1: Write the component

```typescript
// src/components/copy-buttons.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { copyAsMarkdown, copyAsPlainText, copyAsRichText } from '@/lib/copy'
import { toast } from 'sonner'

interface CopyButtonsProps {
  content: string
  className?: string
}

type CopyFormat = 'markdown' | 'plain' | 'rich'

// 每种格式的配置
const FORMATS: {
  key: CopyFormat
  label: string
  icon: string
  fn: (content: string) => Promise<void>
  httpsOnly?: boolean
}[] = [
  { key: 'markdown', label: 'Markdown', icon: '📋', fn: copyAsMarkdown },
  { key: 'plain',    label: '纯文本',   icon: '📄', fn: copyAsPlainText },
  { key: 'rich',     label: '富文本',   icon: '✨', fn: copyAsRichText, httpsOnly: true },
]

export function CopyButtons({ content, className }: CopyButtonsProps) {
  const [copied, setCopied] = useState<CopyFormat | null>(null)

  // 检测是否 HTTPS（rich text 需要 ClipboardItem API）
  const isHttps = typeof window !== 'undefined' && (
    window.location.protocol === 'https:' || window.location.hostname === 'localhost'
  )

  const handleCopy = async (format: typeof FORMATS[0]) => {
    if (format.httpsOnly && !isHttps) {
      toast.error('富文本复制需要 HTTPS 环境')
      return
    }

    try {
      await format.fn(content)
      setCopied(format.key)
      toast.success(`已复制为${format.label}格式`)
      // 0.5 秒后恢复按钮状态
      setTimeout(() => setCopied(null), 500)
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      {FORMATS.map((format) => {
        const isCopied = copied === format.key
        const isDisabled = format.httpsOnly && !isHttps

        return (
          <Button
            key={format.key}
            variant="outline"
            size="sm"
            onClick={() => handleCopy(format)}
            disabled={isDisabled}
            title={isDisabled ? '需要 HTTPS 环境' : `复制为${format.label}`}
            className="text-xs gap-1"
          >
            {isCopied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <span>{format.icon}</span>
            )}
            {isCopied ? '已复制' : format.label}
          </Button>
        )
      })}
    </div>
  )
}
```

> **Note:** This component uses `sonner` for toasts. Check if it's installed:
> ```bash
> grep '"sonner"' package.json || npm install sonner
> ```
> If not installed, add `<Toaster />` from sonner to the root layout.

### Step 2: Manually verify in browser

After building, navigate to any page where InsightResult is shown. The three copy buttons should appear. Test:
1. Click "📋 Markdown" → Paste in Notion/text editor — should show raw Markdown
2. Click "📄 纯文本" → Paste in WeChat — should show clean text without symbols
3. Click "✨ 富文本" (HTTPS only) → Paste in Word — should be formatted

### Step 3: Commit

```bash
git add src/components/copy-buttons.tsx
git commit -m "feat: add CopyButtons component with three format support"
```

---

## Task 4: Create Zustand Auth Store for Credit Balance

**Files:**
- Create: `src/lib/stores/auth-store.ts`

This store keeps the user's credit balance in memory. When the layout fetches profile data server-side, it passes the initial credits to the client. When AI analysis completes, the store updates without a page reload.

### Step 1: Create the store

```typescript
// src/lib/stores/auth-store.ts
import { create } from 'zustand'

interface AuthState {
  credits: number | null
  userId: string | null
  setCredits: (credits: number) => void
  updateCredits: (newBalance: number) => void
  initialize: (userId: string, credits: number) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  credits: null,
  userId: null,

  setCredits: (credits) => set({ credits }),

  updateCredits: (newBalance) => set({ credits: newBalance }),

  initialize: (userId, credits) => set({ userId, credits }),

  reset: () => set({ credits: null, userId: null }),
}))
```

### Step 2: Create a CreditBadge component that reads from the store

```typescript
// src/components/credit-badge.tsx
'use client'

import { useAuthStore } from '@/lib/stores/auth-store'
import { Badge } from '@/components/ui/badge'
import { Coins } from 'lucide-react'

export function CreditBadge() {
  const credits = useAuthStore((s) => s.credits)

  if (credits === null) return null

  return (
    <Badge variant="secondary" className="gap-1 text-sm font-medium">
      <Coins className="h-3.5 w-3.5" />
      {credits} 积分
    </Badge>
  )
}
```

### Step 3: Create a client component to initialize the store from server data

```typescript
// src/components/auth-initializer.tsx
'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'

interface AuthInitializerProps {
  userId: string
  credits: number
}

// Invisible component — just initializes Zustand store with server-fetched data
export function AuthInitializer({ userId, credits }: AuthInitializerProps) {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize(userId, credits)
  }, [userId, credits, initialize])

  return null
}
```

### Step 4: Commit

```bash
mkdir -p src/lib/stores
git add src/lib/stores/auth-store.ts src/components/credit-badge.tsx src/components/auth-initializer.tsx
git commit -m "feat: add Zustand auth store and CreditBadge for dynamic credit display"
```

---

## Task 5: Create Payment Types and Interfaces

**Files:**
- Create: `src/lib/payment/types.ts`

### Step 1: Create the types file

```typescript
// src/lib/payment/types.ts
import type { PackageName } from '@/types'

export interface CreateOrderParams {
  userId: string
  packageName: PackageName
  amountFen: number        // 支付金额（分）
  creditsGranted: number   // 充值积分数
}

export interface CreateOrderResult {
  orderId: string          // 我方订单号
  paymentUrl?: string      // 自动支付跳转链接（auto providers）
  instructions?: string    // 手动支付说明（manual provider）
}

export interface CallbackData {
  orderId: string          // 我方订单号（out_trade_no）
  platformOrder?: string   // 第三方平台订单号
  status: 'paid' | 'failed'
  amountFen: number
}

// Provider 接口——所有支付提供商必须实现此接口
export interface PaymentProvider {
  name: string
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>
  verifyCallback(body: string, signature: string): boolean
  parseCallback(body: string): CallbackData
}
```

### Step 2: Commit

```bash
mkdir -p src/lib/payment/providers
git add src/lib/payment/types.ts
git commit -m "feat: define PaymentProvider interface and types"
```

---

## Task 6: Implement Payment Providers

**Files:**
- Create: `src/lib/payment/providers/manual.ts`
- Create: `src/lib/payment/providers/hupijiao.ts`
- Create: `src/lib/payment/providers/alipay.ts`
- Create: `src/lib/payment/providers/paypal.ts`
- Create: `src/lib/payment/index.ts`

### Step 1: Create ManualPaymentProvider

```typescript
// src/lib/payment/providers/manual.ts
import { createClient } from '@supabase/supabase-js'
import type { CreateOrderParams, CreateOrderResult, CallbackData, PaymentProvider } from '../types'

export class ManualPaymentProvider implements PaymentProvider {
  name = 'manual'

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 生成我方订单号（格式：ORD-YYYYMMDD-随机6位）
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.random().toString(36).slice(2, 8).toUpperCase()
    const outTradeNo = `ORD-${date}-${random}`

    // 保存订单到数据库
    const { error } = await supabase.from('payment_orders').insert({
      user_id: params.userId,
      out_trade_no: outTradeNo,
      package_name: params.packageName,
      amount_fen: params.amountFen,
      credits_granted: params.creditsGranted,
      payment_provider: 'manual',
      status: 'pending',
    })

    if (error) throw new Error(`Failed to create order: ${error.message}`)

    const paypalLink = process.env.PAYPAL_RECEIVE_LINK ?? 'PayPal.Me/SoulfulCai'
    const amountYuan = (params.amountFen / 100).toFixed(2)

    return {
      orderId: outTradeNo,
      instructions: `请通过以下方式完成支付：

📧 PayPal: ${paypalLink}
💰 金额：¥${amountYuan}（${params.packageName}，${params.creditsGranted} 积分）
📝 备注：${outTradeNo}

支付完成后请联系管理员，提供您的注册邮箱，管理员将在24小时内充值积分。`,
    }
  }

  // 手动模式无 webhook，直接返回 true
  verifyCallback(_body: string, _signature: string): boolean {
    return true
  }

  parseCallback(_body: string): CallbackData {
    throw new Error('Manual payment provider has no callback')
  }
}
```

### Step 2: Create stub providers (预留接口)

```typescript
// src/lib/payment/providers/hupijiao.ts
import type { CreateOrderParams, CreateOrderResult, CallbackData, PaymentProvider } from '../types'

export class HupijiaoProvider implements PaymentProvider {
  name = 'hupijiao'

  async createOrder(_params: CreateOrderParams): Promise<CreateOrderResult> {
    throw new Error('HupijiaoProvider: not implemented yet')
  }

  verifyCallback(_body: string, _signature: string): boolean {
    throw new Error('HupijiaoProvider: not implemented yet')
  }

  parseCallback(_body: string): CallbackData {
    throw new Error('HupijiaoProvider: not implemented yet')
  }
}
```

```typescript
// src/lib/payment/providers/alipay.ts
import type { CreateOrderParams, CreateOrderResult, CallbackData, PaymentProvider } from '../types'

export class AlipayProvider implements PaymentProvider {
  name = 'alipay'

  async createOrder(_params: CreateOrderParams): Promise<CreateOrderResult> {
    throw new Error('AlipayProvider: not implemented yet')
  }

  verifyCallback(_body: string, _signature: string): boolean {
    throw new Error('AlipayProvider: not implemented yet')
  }

  parseCallback(_body: string): CallbackData {
    throw new Error('AlipayProvider: not implemented yet')
  }
}
```

```typescript
// src/lib/payment/providers/paypal.ts
import type { CreateOrderParams, CreateOrderResult, CallbackData, PaymentProvider } from '../types'

export class PayPalProvider implements PaymentProvider {
  name = 'paypal'

  async createOrder(_params: CreateOrderParams): Promise<CreateOrderResult> {
    throw new Error('PayPalProvider: not implemented yet')
  }

  verifyCallback(_body: string, _signature: string): boolean {
    throw new Error('PayPalProvider: not implemented yet')
  }

  parseCallback(_body: string): CallbackData {
    throw new Error('PayPalProvider: not implemented yet')
  }
}
```

### Step 3: Create the provider factory

```typescript
// src/lib/payment/index.ts
import type { PaymentProvider } from './types'
import { ManualPaymentProvider } from './providers/manual'
import { HupijiaoProvider } from './providers/hupijiao'
import { AlipayProvider } from './providers/alipay'
import { PayPalProvider } from './providers/paypal'

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? 'manual'

  switch (provider) {
    case 'hupijiao': return new HupijiaoProvider()
    case 'alipay':   return new AlipayProvider()
    case 'paypal':   return new PayPalProvider()
    default:         return new ManualPaymentProvider()
  }
}

export type { PaymentProvider, CreateOrderParams, CreateOrderResult, CallbackData } from './types'
```

### Step 4: Commit

```bash
git add src/lib/payment/
git commit -m "feat: implement payment abstraction layer with Manual provider and stubs"
```

---

## Task 7: Create Payment API Routes

**Files:**
- Create: `src/app/api/payment/create/route.ts`
- Create: `src/app/api/payment/webhook/route.ts`

### Step 1: Write test for input validation

```typescript
// src/__tests__/api/payment.test.ts
// Note: These are integration tests — run against a test environment
// For now, we write unit tests for the validation logic

import { z } from 'zod'

const CreatePaymentSchema = z.object({
  packageName: z.enum(['入门包', '标准包', '专业包']),
})

describe('CreatePaymentSchema', () => {
  it('accepts valid package names', () => {
    expect(() => CreatePaymentSchema.parse({ packageName: '入门包' })).not.toThrow()
    expect(() => CreatePaymentSchema.parse({ packageName: '标准包' })).not.toThrow()
    expect(() => CreatePaymentSchema.parse({ packageName: '专业包' })).not.toThrow()
  })

  it('rejects invalid package names', () => {
    expect(() => CreatePaymentSchema.parse({ packageName: '无效包' })).toThrow()
    expect(() => CreatePaymentSchema.parse({ packageName: '' })).toThrow()
    expect(() => CreatePaymentSchema.parse({})).toThrow()
  })
})
```

### Step 2: Run validation test

```bash
npx jest src/__tests__/api/payment.test.ts
```

Expected: All tests PASS

### Step 3: Create payment/create route

```typescript
// src/app/api/payment/create/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getPaymentProvider } from '@/lib/payment'
import { PACKAGES, type PackageName } from '@/types'

const CreatePaymentSchema = z.object({
  packageName: z.enum(['入门包', '标准包', '专业包'] as [PackageName, ...PackageName[]]),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = CreatePaymentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid package name' }, { status: 400 })
  }

  const { packageName } = parsed.data
  const pkg = PACKAGES[packageName]

  const provider = getPaymentProvider()

  const result = await provider.createOrder({
    userId: user.id,
    packageName,
    amountFen: pkg.amount_fen,
    creditsGranted: pkg.credits,
  })

  return NextResponse.json({
    orderId: result.orderId,
    paymentUrl: result.paymentUrl ?? null,
    instructions: result.instructions ?? null,
    provider: provider.name,
  })
}
```

### Step 4: Create payment/webhook route (reserved framework)

```typescript
// src/app/api/payment/webhook/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPaymentProvider } from '@/lib/payment'

export async function POST(req: Request) {
  const provider = getPaymentProvider()
  const body = await req.text()
  const signature = req.headers.get('x-signature') ?? ''

  // 验证签名（手动模式直接放行）
  if (!provider.verifyCallback(body, signature)) {
    return new Response('Invalid signature', { status: 403 })
  }

  let callbackData
  try {
    callbackData = provider.parseCallback(body)
  } catch {
    // 手动模式不支持回调
    return new Response('ok')
  }

  if (callbackData.status !== 'paid') {
    return new Response('ok')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 幂等检查：避免重复充值
  const { data: order } = await supabase
    .from('payment_orders')
    .select('id, status, user_id, credits_granted')
    .eq('out_trade_no', callbackData.orderId)
    .single()

  if (!order || order.status === 'paid') {
    return new Response('ok')
  }

  // TODO: 实现 grantCreditsFromPayment 后调用
  // await grantCreditsFromPayment(order.user_id, order.credits_granted, order.id)

  return new Response('success')
}
```

### Step 5: Commit

```bash
git add src/app/api/payment/ src/__tests__/api/payment.test.ts
git commit -m "feat: add payment create and webhook API routes"
```

---

## Task 8: Create Admin Credits API Route

**Files:**
- Create: `src/app/api/admin/credits/route.ts`

### Step 1: Write validation test

```typescript
// src/__tests__/api/admin-credits.test.ts
import { z } from 'zod'

const AdminCreditsSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().refine(n => n !== 0, 'Amount cannot be zero'),
  description: z.string().min(1).max(200),
})

describe('AdminCreditsSchema', () => {
  it('accepts valid charge', () => {
    expect(() => AdminCreditsSchema.parse({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 100,
      description: '测试充值',
    })).not.toThrow()
  })

  it('accepts valid deduction', () => {
    expect(() => AdminCreditsSchema.parse({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      amount: -50,
      description: '退款扣减',
    })).not.toThrow()
  })

  it('rejects amount of zero', () => {
    expect(() => AdminCreditsSchema.parse({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 0,
      description: '无效',
    })).toThrow()
  })

  it('rejects missing description', () => {
    expect(() => AdminCreditsSchema.parse({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 100,
      description: '',
    })).toThrow()
  })
})
```

### Step 2: Run validation test

```bash
npx jest src/__tests__/api/admin-credits.test.ts
```

Expected: All tests PASS

### Step 3: Create the admin credits route

```typescript
// src/app/api/admin/credits/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const AdminCreditsSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().refine(n => n !== 0, { message: 'Amount cannot be zero' }),
  description: z.string().min(1).max(200),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 验证请求者是管理员
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = AdminCreditsSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { userId, amount, description } = parsed.data

  // 使用 service role client 绕过 RLS
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. 获取用户当前积分
  const { data: targetProfile, error: profileError } = await serviceClient
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (profileError || !targetProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const newBalance = targetProfile.credits + amount

  // 防止积分变为负数（只在扣减时检查）
  if (newBalance < 0) {
    return NextResponse.json(
      { error: `积分不足：当前 ${targetProfile.credits}，扣减 ${Math.abs(amount)}` },
      { status: 400 }
    )
  }

  // 2. 更新积分
  const { error: updateError } = await serviceClient
    .from('profiles')
    .update({ credits: newBalance, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 })
  }

  // 3. 记录流水
  const transactionType = amount > 0 ? 'manual_grant' : 'admin_deduct'
  const { error: txError } = await serviceClient
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount,
      balance_after: newBalance,
      type: transactionType,
      description,
      operated_by: user.id,
    })

  if (txError) {
    // 流水插入失败不回滚，但记录错误（积分已更新）
    console.error('Failed to insert credit transaction:', txError)
  }

  return NextResponse.json({ newBalance })
}
```

### Step 4: Commit

```bash
git add src/app/api/admin/credits/route.ts src/__tests__/api/admin-credits.test.ts
git commit -m "feat: add admin credits API route for manual credit management"
```

---

## Task 9: Create Admin Users API Route (for user list)

**Files:**
- Create: `src/app/api/admin/users/route.ts`

### Step 1: Create the route

```typescript
// src/app/api/admin/users/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20
  const offset = (page - 1) * limit

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 通过 auth.users 联合 profiles 查询（需要 service role）
  let query = serviceClient
    .from('profiles')
    .select('id, username, role, credits, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // 注意：邮箱在 auth.users 表，profiles 表没有 email 字段
  // 暂用 username 搜索（后续可通过 RPC 联表）
  if (search) {
    query = query.ilike('username', `%${search}%`)
  }

  const { data: profiles, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    users: profiles ?? [],
    total: count ?? 0,
    page,
    limit,
  })
}
```

### Step 2: Commit

```bash
git add src/app/api/admin/users/route.ts
git commit -m "feat: add admin users list API with pagination"
```

---

## Task 10: Create Profile Page

**Files:**
- Create: `src/app/(main)/profile/page.tsx`

### Step 1: Write the profile page

```typescript
// src/app/(main)/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileTabs } from './profile-tabs'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 获取 profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 获取消费记录（最近 50 条）
  const { data: transactions } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">个人中心</h1>
      <ProfileTabs
        profile={profile}
        transactions={transactions ?? []}
        email={user.email ?? ''}
      />
    </div>
  )
}
```

### Step 2: Create ProfileTabs client component

```typescript
// src/app/(main)/profile/profile-tabs.tsx
'use client'

import { useState } from 'react'
import { Profile, CreditTransaction, PACKAGES } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ProfileTabsProps {
  profile: Profile | null
  transactions: CreditTransaction[]
  email: string
}

type Tab = 'account' | 'credits' | 'history'

export function ProfileTabs({ profile, transactions, email }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('account')
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'account', label: '账户信息' },
    { key: 'credits', label: '积分 & 充值' },
    { key: 'history', label: '消费记录' },
  ]

  const handlePackageClick = (pkgName: string) => {
    setSelectedPackage(pkgName)
    setShowModal(true)
  }

  return (
    <div>
      {/* Tab 导航 */}
      <div className="flex border-b mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 账户信息 Tab */}
      {activeTab === 'account' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">邮箱</span>
              <span className="font-medium">{email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">用户名</span>
              <span className="font-medium">{profile?.username ?? '未设置'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">角色</span>
              <Badge variant={profile?.role === 'admin' ? 'default' : 'secondary'}>
                {profile?.role === 'admin' ? '管理员' : '普通用户'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">注册时间</span>
              <span className="font-medium">
                {profile?.created_at
                  ? format(new Date(profile.created_at), 'yyyy-MM-dd', { locale: zhCN })
                  : '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 积分 & 充值 Tab */}
      {activeTab === 'credits' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-1">当前余额</p>
                <p className="text-4xl font-bold">{profile?.credits ?? 0}</p>
                <p className="text-muted-foreground text-sm mt-1">积分</p>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">选择充值套餐</h3>
            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(PACKAGES) as [string, { credits: number; amount_fen: number }][]).map(
                ([name, pkg]) => (
                  <Card
                    key={name}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handlePackageClick(name)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-center text-base">{name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-center">
                      <p className="text-2xl font-bold">{pkg.credits}</p>
                      <p className="text-xs text-muted-foreground mb-2">积分</p>
                      <p className="text-lg font-semibold text-primary">
                        ¥{(pkg.amount_fen / 100).toFixed(0)}
                      </p>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* 消费记录 Tab */}
      {activeTab === 'history' && (
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无消费记录</div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{tx.description ?? tx.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(tx.created_at), 'MM-dd HH:mm', { locale: zhCN })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} 积分
                  </p>
                  <p className="text-xs text-muted-foreground">余额 {tx.balance_after}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 充值 Modal（暂不可用）*/}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>支付功能开发中</DialogTitle>
            <DialogDescription>
              自动支付功能正在开发中，目前请通过以下方式手动充值：
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2">
              <span>📧</span>
              <div>
                <p className="text-sm font-medium">PayPal</p>
                <p className="text-sm text-muted-foreground">PayPal.Me/SoulfulCai</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span>💰</span>
              <div>
                <p className="text-sm font-medium">金额</p>
                <p className="text-sm text-muted-foreground">
                  选择套餐对应金额（
                  {selectedPackage && PACKAGES[selectedPackage as keyof typeof PACKAGES]
                    ? `¥${PACKAGES[selectedPackage as keyof typeof PACKAGES].amount_fen / 100}`
                    : '见套餐'}
                  ）
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span>📝</span>
              <div>
                <p className="text-sm font-medium">备注</p>
                <p className="text-sm text-muted-foreground">您的注册邮箱</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              完成支付后，请联系管理员充值积分（通常 24 小时内处理）。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

### Step 3: Check if `date-fns/locale` is available

```bash
node -e "require('date-fns/locale').zhCN && console.log('OK')"
```

If error, install: `npm install date-fns`

### Step 4: Commit

```bash
git add src/app/\(main\)/profile/
git commit -m "feat: add profile page with account info, credits recharge, and history tabs"
```

---

## Task 11: Create Admin User Detail Page

**Files:**
- Create: `src/app/admin/users/[id]/page.tsx`

### Step 1: Write the admin user detail page

```typescript
// src/app/admin/users/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminCreditForm } from './admin-credit-form'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient as createServiceClient } from '@supabase/supabase-js'

interface Props {
  params: { id: string }
}

export default async function AdminUserDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') redirect('/')

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 获取目标用户资料
  const { data: targetProfile } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!targetProfile) redirect('/admin')

  // 获取该用户的积分流水
  const { data: transactions } = await serviceClient
    .from('credit_transactions')
    .select('*')
    .eq('user_id', params.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">用户详情</h1>
        <a href="/admin" className="text-sm text-muted-foreground hover:underline">
          ← 返回用户列表
        </a>
      </div>

      {/* 用户基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">用户 ID</span>
            <span className="font-mono text-sm">{targetProfile.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">用户名</span>
            <span>{targetProfile.username ?? '未设置'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">角色</span>
            <Badge variant={targetProfile.role === 'admin' ? 'default' : 'secondary'}>
              {targetProfile.role === 'admin' ? '管理员' : '普通用户'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">注册时间</span>
            <span>{format(new Date(targetProfile.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">当前积分</span>
            <span className="text-2xl font-bold">{targetProfile.credits}</span>
          </div>
        </CardContent>
      </Card>

      {/* 手动调整积分 */}
      <AdminCreditForm userId={params.id} currentBalance={targetProfile.credits} />

      {/* 积分流水 */}
      <Card>
        <CardHeader>
          <CardTitle>积分流水</CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">暂无记录</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-4 text-xs text-muted-foreground pb-2 border-b">
                <span>时间</span>
                <span>类型</span>
                <span className="text-right">金额</span>
                <span className="text-right">余额</span>
              </div>
              {transactions.map((tx) => (
                <div key={tx.id} className="grid grid-cols-4 text-sm py-2 border-b last:border-0">
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(tx.created_at), 'MM-dd HH:mm', { locale: zhCN })}
                  </span>
                  <span className="text-xs">{tx.description ?? tx.type}</span>
                  <span className={`text-right font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                  <span className="text-right text-muted-foreground">{tx.balance_after}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### Step 2: Create the AdminCreditForm client component

```typescript
// src/app/admin/users/[id]/admin-credit-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface AdminCreditFormProps {
  userId: string
  currentBalance: number
}

export function AdminCreditForm({ userId, currentBalance }: AdminCreditFormProps) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (type: 'grant' | 'deduct') => {
    const numAmount = parseInt(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('请输入有效的正整数金额')
      return
    }
    if (!description.trim()) {
      toast.error('请填写操作备注')
      return
    }

    const finalAmount = type === 'deduct' ? -numAmount : numAmount

    setLoading(true)
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: finalAmount, description: description.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? '操作失败')
        return
      }

      toast.success(`操作成功！新余额：${data.newBalance} 积分`)
      setAmount('')
      setDescription('')
      router.refresh()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>手动调整积分</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {[100, 500, 1200].map((preset) => (
            <Button
              key={preset}
              variant="outline"
              size="sm"
              onClick={() => setAmount(String(preset))}
            >
              +{preset}
            </Button>
          ))}
          {[50, 100].map((preset) => (
            <Button
              key={`-${preset}`}
              variant="outline"
              size="sm"
              onClick={() => setAmount(String(preset))}
            >
              -{preset}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">调整数量（正整数）</Label>
          <Input
            id="amount"
            type="number"
            min="1"
            placeholder="输入积分数量"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">操作备注（必填，最多 200 字）</Label>
          <Input
            id="description"
            maxLength={200}
            placeholder="例：PayPal 转账 ¥45，订单 ORD-20260305-001"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => handleSubmit('grant')}
            disabled={loading}
            className="flex-1"
          >
            充值积分
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleSubmit('deduct')}
            disabled={loading}
            className="flex-1"
          >
            扣减积分
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          当前余额：{currentBalance} 积分
        </p>
      </CardContent>
    </Card>
  )
}
```

### Step 3: Commit

```bash
git add src/app/admin/users/\[id\]/
git commit -m "feat: add admin user detail page with manual credit management"
```

---

## Task 12: Install Sonner for Toast Notifications

**Note:** If `sonner` is not yet installed, do this step now.

### Step 1: Check if sonner is installed

```bash
grep '"sonner"' package.json || echo "NOT INSTALLED"
```

### Step 2: If not installed, install and add to layout

```bash
npm install sonner
```

### Step 3: Add Toaster to root layout

In `src/app/layout.tsx`, add:

```typescript
import { Toaster } from 'sonner'

// In the body:
<body>
  {children}
  <Toaster richColors position="top-right" />
</body>
```

### Step 4: Commit (if changed)

```bash
git add package.json package-lock.json src/app/layout.tsx
git commit -m "chore: add sonner toast notifications"
```

---

## Task 13: Acceptance Verification

### Step 1: Run all tests

```bash
npx jest --testPathPattern="src/__tests__"
```

Expected: All tests PASS

### Step 2: Start the dev server

```bash
npm run dev
```

### Step 3: Manual acceptance checklist

```markdown
复制功能：
□ 打开任意文档详情页（需先有 InsightResult — Day 4 组件）
□ 点击 "📋 Markdown" → 粘贴到文本编辑器 → 验证 Markdown 格式正确
□ 点击 "📄 纯文本" → 粘贴到文本编辑器 → 验证没有 # * _ 等符号
□ 点击 "✨ 富文本"（HTTPS/localhost 下）→ 粘贴到 Word/飞书 → 验证格式正确
□ 点击 "✨ 富文本"（HTTP 下）→ 显示 toast 错误提示

积分余额：
□ 顶部导航栏显示当前积分余额（CreditBadge）
□ （Day 4 AI 分析完成后）积分实时更新，不需刷新页面

Profile 页：
□ 访问 /profile → 显示三个 Tab
□ 账户信息 Tab → 正确显示邮箱、角色、注册时间
□ 积分 & 充值 Tab → 显示当前余额 + 三个套餐卡片
□ 点击任意套餐 → 弹出 Modal，显示 PayPal 充值说明
□ 消费记录 Tab → 显示历史流水列表

管理员手动充值：
□ 以管理员身份访问 /admin/users/[id]
□ 输入金额 + 备注，点击"充值积分" → toast 显示"操作成功"
□ 刷新页面 → 积分余额已更新
□ 积分流水中出现新记录，type = 'manual_grant'
□ 输入超过当前余额的扣减金额 → 返回错误提示

安全验证：
□ 非管理员用户调用 POST /api/admin/credits → 返回 403
□ 未登录用户调用 POST /api/payment/create → 返回 401
```

### Step 4: Final commit

```bash
git add -A
git commit -m "chore: Day 5 complete — copy formats, payment abstraction, admin credit management"
```

---

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| `marked` for HTML conversion | Lightweight, no SSR issues, simple API |
| `ClipboardItem` with fallback | Native API, graceful degradation for HTTP environments |
| Zustand store for credits | Lightweight, no context providers needed, easy to update from anywhere |
| `AuthInitializer` client component | Bridge between server-fetched data and client store |
| Service role client in admin routes | RLS allows users to only see their own data; admin needs service key to bypass |
| `amount` can be negative in admin API | Unified endpoint for both grant and deduct; sign determines type |
| `payment_provider` field in orders | Auditable; when switching providers, old orders still have correct attribution |

## Dependencies Summary

| Package | Purpose | Status |
|---------|---------|--------|
| `marked` | Markdown → HTML conversion | Install in Task 1 |
| `@types/marked` | TypeScript types for marked | Install in Task 1 |
| `sonner` | Toast notifications | Check/install in Task 12 |
| `date-fns` | Date formatting | Should already exist (in package.json) |
| `zustand` | Global state | Already installed |
| `zod` | Input validation | Already installed |
