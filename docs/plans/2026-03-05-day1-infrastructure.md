# Day 1 基础设施实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 修复数据库迁移文件、迁移 Supabase 客户端到 @supabase/ssr、完善类型系统、实现路由保护 Middleware、创建登录注册页面，使项目可注册登录。

**架构：** Next.js 15 App Router + Supabase Auth（Email/Password）+ Middleware JWT 校验。所有敏感操作在服务端执行，前端通过 Cookie 维持 Session。

**技术栈：** Next.js 15, TypeScript, @supabase/ssr, @supabase/supabase-js, Tailwind CSS, Shadcn/UI (new-york/zinc)

---

## 当前状态速览

| 文件/目录 | 状态 | 问题 |
|----------|------|------|
| `supabase/migrations/001_initial_schema.sql` | 存在 | 前向引用 Bug（见 Task 1） |
| `src/types/supabase.ts` | 存在 | 是 chat-app 模板，需完全重写 |
| `src/types/index.ts` | 存在 | 字段名与 DB schema 不一致 |
| `src/lib/supabase/client.ts` | 存在 | 使用已弃用的 auth-helpers-nextjs |
| `src/lib/supabase/server.ts` | 存在 | 使用已弃用的 auth-helpers-nextjs |
| `src/middleware.ts` | 不存在 | 需新建 |
| `src/components/ui/` | 空目录 | Shadcn 组件需安装 |
| `src/app/(auth)/login/page.tsx` | 不存在 | 需新建 |
| `src/app/(auth)/register/page.tsx` | 不存在 | 需新建 |
| `src/app/(auth)/layout.tsx` | 不存在 | 需新建 |

---

## Task 1: 修复迁移文件前向引用 Bug

**问题分析：**
`001_initial_schema.sql` 中表的创建顺序有误：
- `insights` 引用了 `custom_lenses(id)`，但 `custom_lenses` 在后面才创建
- `credit_transactions` 引用了 `payment_orders(id)`，但 `payment_orders` 在后面才创建

PostgreSQL 执行 `CREATE TABLE` 时，被引用的表必须已存在。

**Files:**
- Modify: `supabase/migrations/001_initial_schema.sql`

**Step 1: 重写 001_initial_schema.sql，正确排序表**

正确顺序：profiles → custom_lenses → documents → payment_orders → insights → credit_transactions → feedbacks → system_prompts → announcements

```sql
-- =============================================
-- Crusher · 碎石记 · 初始数据库架构
-- =============================================

-- =============================================
-- 用户扩展信息
-- =============================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT,
  role        TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  credits     INTEGER DEFAULT 0 CHECK (credits >= 0),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 自定义透镜（必须在 insights 之前创建）
-- =============================================
CREATE TABLE custom_lenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  icon          TEXT DEFAULT '🔧',
  description   TEXT,
  system_prompt TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 文档/原始内容
-- =============================================
CREATE TABLE documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT,
  raw_content  TEXT NOT NULL,
  char_count   INTEGER NOT NULL DEFAULT 0,
  source_type  TEXT DEFAULT 'text' CHECK (source_type IN ('text', 'voice')),
  is_deleted   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 支付订单（必须在 credit_transactions 之前创建）
-- =============================================
CREATE TABLE payment_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  out_trade_no    TEXT UNIQUE NOT NULL,
  platform_order  TEXT,
  package_name    TEXT NOT NULL,
  amount_fen      INTEGER NOT NULL,
  credits_granted INTEGER NOT NULL,
  payment_method  TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AI 分析结果
-- =============================================
CREATE TABLE insights (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lens_type      TEXT NOT NULL CHECK (lens_type IN ('requirements', 'meeting', 'review', 'risk', 'change', 'postmortem', 'tech', 'custom')),
  custom_lens_id UUID REFERENCES custom_lenses(id),
  result         TEXT NOT NULL,
  model          TEXT DEFAULT 'deepseek-chat',
  prompt_version TEXT DEFAULT 'v1',
  input_chars    INTEGER,
  input_tokens   INTEGER,
  output_tokens  INTEGER,
  credits_cost   INTEGER NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 积分交易流水（只增不改，审计用）
-- =============================================
CREATE TABLE credit_transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount             INTEGER NOT NULL,
  balance_after      INTEGER NOT NULL,
  type               TEXT NOT NULL CHECK (type IN ('payment', 'manual_grant', 'consumed', 'admin_deduct', 'refund')),
  description        TEXT,
  related_insight_id UUID REFERENCES insights(id),
  related_order_id   UUID REFERENCES payment_orders(id),
  operated_by        UUID REFERENCES profiles(id),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 用户反馈 / 投诉 / Bug 报告
-- =============================================
CREATE TABLE feedbacks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type               TEXT NOT NULL CHECK (type IN ('payment', 'bug', 'feature', 'other')),
  title              TEXT NOT NULL,
  content            TEXT NOT NULL,
  context_url        TEXT,
  related_order_id   UUID REFERENCES payment_orders(id),
  related_insight_id UUID REFERENCES insights(id),
  status             TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'resolved', 'closed')),
  admin_note         TEXT,
  handled_by         UUID REFERENCES profiles(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 系统 Prompt 版本管理
-- =============================================
CREATE TABLE system_prompts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_type     TEXT NOT NULL,
  version       TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT FALSE,
  notes         TEXT,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lens_type, version)
);

-- =============================================
-- 系统公告
-- =============================================
CREATE TABLE announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  type       TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'maintenance')),
  is_active  BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Step 2: 验证文件已保存**

用肉眼检查文件，确认 `custom_lenses` 在 `insights` 之前，`payment_orders` 在 `credit_transactions` 之前。

---

## Task 2: 安装 @supabase/ssr 并卸载弃用包

**Files:**
- Modify: `package.json`（通过 npm 命令）

**Step 1: 安装 @supabase/ssr**

```bash
npm install @supabase/ssr
```

Expected: `@supabase/ssr@x.x.x added`

**Step 2: 卸载 auth-helpers-nextjs**

```bash
npm uninstall @supabase/auth-helpers-nextjs
```

Expected: `removed x packages`

---

## Task 3: 安装 Shadcn UI 核心组件

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/label.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/separator.tsx`
- Create: `src/components/ui/form.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/dropdown-menu.tsx`
- Create: `src/components/ui/avatar.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/toast.tsx`（sonner 已安装，不需要 shadcn toast）

**Step 1: 使用 shadcn CLI 添加组件**

```bash
cd /Users/caisongfu/soulful/personal/crusher
npx shadcn@latest add button input label card badge separator form dialog dropdown-menu avatar textarea --yes
```

Expected: 各组件文件生成到 `src/components/ui/`

**Step 2: 验证 button 组件存在**

```bash
ls src/components/ui/
```

Expected: button.tsx input.tsx label.tsx card.tsx 等文件列出

---

## Task 4: 重写 src/types/supabase.ts（Crusher 专属数据库类型）

**Files:**
- Modify: `src/types/supabase.ts`（完全重写）

**Step 1: 写入 Crusher 专属 Database 类型**

完整内容（与 001_initial_schema.sql 完全对应）：

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          role: 'user' | 'admin'
          credits: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          role?: 'user' | 'admin'
          credits?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          role?: 'user' | 'admin'
          credits?: number
          created_at?: string
          updated_at?: string
        }
      }
      custom_lenses: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string
          description: string | null
          system_prompt: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icon?: string
          description?: string | null
          system_prompt: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          icon?: string
          description?: string | null
          system_prompt?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          title: string | null
          raw_content: string
          char_count: number
          source_type: 'text' | 'voice'
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          raw_content: string
          char_count?: number
          source_type?: 'text' | 'voice'
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          raw_content?: string
          char_count?: number
          source_type?: 'text' | 'voice'
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payment_orders: {
        Row: {
          id: string
          user_id: string
          out_trade_no: string
          platform_order: string | null
          package_name: string
          amount_fen: number
          credits_granted: number
          payment_method: string | null
          status: 'pending' | 'paid' | 'failed' | 'refunded'
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          out_trade_no: string
          platform_order?: string | null
          package_name: string
          amount_fen: number
          credits_granted: number
          payment_method?: string | null
          status?: 'pending' | 'paid' | 'failed' | 'refunded'
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          out_trade_no?: string
          platform_order?: string | null
          package_name?: string
          amount_fen?: number
          credits_granted?: number
          payment_method?: string | null
          status?: 'pending' | 'paid' | 'failed' | 'refunded'
          paid_at?: string | null
          created_at?: string
        }
      }
      insights: {
        Row: {
          id: string
          document_id: string
          user_id: string
          lens_type: 'requirements' | 'meeting' | 'review' | 'risk' | 'change' | 'postmortem' | 'tech' | 'custom'
          custom_lens_id: string | null
          result: string
          model: string
          prompt_version: string
          input_chars: number | null
          input_tokens: number | null
          output_tokens: number | null
          credits_cost: number
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          user_id: string
          lens_type: 'requirements' | 'meeting' | 'review' | 'risk' | 'change' | 'postmortem' | 'tech' | 'custom'
          custom_lens_id?: string | null
          result: string
          model?: string
          prompt_version?: string
          input_chars?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          credits_cost: number
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string
          lens_type?: 'requirements' | 'meeting' | 'review' | 'risk' | 'change' | 'postmortem' | 'tech' | 'custom'
          custom_lens_id?: string | null
          result?: string
          model?: string
          prompt_version?: string
          input_chars?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          credits_cost?: number
          created_at?: string
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          balance_after: number
          type: 'payment' | 'manual_grant' | 'consumed' | 'admin_deduct' | 'refund'
          description: string | null
          related_insight_id: string | null
          related_order_id: string | null
          operated_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          balance_after: number
          type: 'payment' | 'manual_grant' | 'consumed' | 'admin_deduct' | 'refund'
          description?: string | null
          related_insight_id?: string | null
          related_order_id?: string | null
          operated_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          balance_after?: number
          type?: 'payment' | 'manual_grant' | 'consumed' | 'admin_deduct' | 'refund'
          description?: string | null
          related_insight_id?: string | null
          related_order_id?: string | null
          operated_by?: string | null
          created_at?: string
        }
      }
      feedbacks: {
        Row: {
          id: string
          user_id: string
          type: 'payment' | 'bug' | 'feature' | 'other'
          title: string
          content: string
          context_url: string | null
          related_order_id: string | null
          related_insight_id: string | null
          status: 'pending' | 'processing' | 'resolved' | 'closed'
          admin_note: string | null
          handled_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'payment' | 'bug' | 'feature' | 'other'
          title: string
          content: string
          context_url?: string | null
          related_order_id?: string | null
          related_insight_id?: string | null
          status?: 'pending' | 'processing' | 'resolved' | 'closed'
          admin_note?: string | null
          handled_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'payment' | 'bug' | 'feature' | 'other'
          title?: string
          content?: string
          context_url?: string | null
          related_order_id?: string | null
          related_insight_id?: string | null
          status?: 'pending' | 'processing' | 'resolved' | 'closed'
          admin_note?: string | null
          handled_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      system_prompts: {
        Row: {
          id: string
          lens_type: string
          version: string
          system_prompt: string
          is_active: boolean
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lens_type: string
          version: string
          system_prompt: string
          is_active?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lens_type?: string
          version?: string
          system_prompt?: string
          is_active?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      announcements: {
        Row: {
          id: string
          title: string
          content: string
          type: 'info' | 'warning' | 'maintenance'
          is_active: boolean
          expires_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          type?: 'info' | 'warning' | 'maintenance'
          is_active?: boolean
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          type?: 'info' | 'warning' | 'maintenance'
          is_active?: boolean
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      deduct_credits: {
        Args: {
          p_user_id: string
          p_cost: number
          p_description: string
          p_related_insight_id?: string | null
        }
        Returns: Json
      }
    }
    Enums: Record<string, never>
  }
}

// 便捷类型别名
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
```

---

## Task 5: 重写 src/types/index.ts（业务层类型，与 DB schema 对齐）

**Files:**
- Modify: `src/types/index.ts`（完全重写）

**Step 1: 写入对齐后的类型定义**

```typescript
// =============================================
// 用户 & Profile
// =============================================
export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string               // 同 auth.users.id
  username: string | null
  role: UserRole
  credits: number
  created_at: string
  updated_at: string
}

// =============================================
// 文档（原始内容）
// =============================================
export type SourceType = 'text' | 'voice'

export interface Document {
  id: string
  user_id: string
  title: string | null
  raw_content: string
  char_count: number
  source_type: SourceType
  is_deleted: boolean
  created_at: string
  updated_at: string
}

// =============================================
// 透镜
// =============================================
export type LensType =
  | 'requirements'
  | 'meeting'
  | 'review'
  | 'risk'
  | 'change'
  | 'postmortem'
  | 'tech'
  | 'custom'

export interface CustomLens {
  id: string
  user_id: string
  name: string
  icon: string
  description: string | null
  system_prompt: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// =============================================
// AI 分析结果
// =============================================
export interface Insight {
  id: string
  document_id: string
  user_id: string
  lens_type: LensType
  custom_lens_id: string | null
  result: string
  model: string
  prompt_version: string
  input_chars: number | null
  input_tokens: number | null
  output_tokens: number | null
  credits_cost: number
  created_at: string
}

// =============================================
// 积分 & 支付
// =============================================
export type TransactionType = 'payment' | 'manual_grant' | 'consumed' | 'admin_deduct' | 'refund'

export interface CreditTransaction {
  id: string
  user_id: string
  amount: number           // 正数=充值，负数=消耗
  balance_after: number
  type: TransactionType
  description: string | null
  related_insight_id: string | null
  related_order_id: string | null
  operated_by: string | null
  created_at: string
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface PaymentOrder {
  id: string
  user_id: string
  out_trade_no: string
  platform_order: string | null
  package_name: string
  amount_fen: number       // 单位：分
  credits_granted: number
  payment_method: string | null
  status: PaymentStatus
  paid_at: string | null
  created_at: string
}

// 套餐配置
export const PACKAGES = {
  '入门包': { credits: 100, amount_fen: 1000 },   // ¥10
  '标准包': { credits: 500, amount_fen: 4500 },   // ¥45
  '专业包': { credits: 1200, amount_fen: 9600 },  // ¥96
} as const

export type PackageName = keyof typeof PACKAGES

// =============================================
// 反馈
// =============================================
export type FeedbackType = 'payment' | 'bug' | 'feature' | 'other'
export type FeedbackStatus = 'pending' | 'processing' | 'resolved' | 'closed'

export interface Feedback {
  id: string
  user_id: string
  type: FeedbackType
  title: string
  content: string
  context_url: string | null
  related_order_id: string | null
  related_insight_id: string | null
  status: FeedbackStatus
  admin_note: string | null
  handled_by: string | null
  created_at: string
  updated_at: string
}

// =============================================
// 系统管理
// =============================================
export interface SystemPrompt {
  id: string
  lens_type: string
  version: string
  system_prompt: string
  is_active: boolean
  notes: string | null
  created_by: string | null
  created_at: string
}

export type AnnouncementType = 'info' | 'warning' | 'maintenance'

export interface Announcement {
  id: string
  title: string
  content: string
  type: AnnouncementType
  is_active: boolean
  expires_at: string | null
  created_by: string | null
  created_at: string
}

// =============================================
// 积分计算（前端实时预览）
// =============================================
export function calculateCreditCost(charCount: number): number {
  if (charCount <= 3000) return 10
  if (charCount <= 6000) return 15
  if (charCount <= 10000) return 22
  return 22 + Math.ceil((charCount - 10000) / 1000) * 5
}
```

---

## Task 6: 更新 src/lib/supabase/client.ts（迁移到 @supabase/ssr）

**Files:**
- Modify: `src/lib/supabase/client.ts`

**Step 1: 重写为 @supabase/ssr 版本**

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## Task 7: 更新 src/lib/supabase/server.ts（迁移到 @supabase/ssr）

**Files:**
- Modify: `src/lib/supabase/server.ts`

**Step 1: 重写为 @supabase/ssr 版本**

```typescript
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()

  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component 中调用 setAll 会报错，可以忽略
          }
        },
      },
    }
  )
}

// 获取当前登录用户（服务端）
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) return null
  return user
}

// 获取当前用户 Profile（服务端）
export async function getCurrentProfile() {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

// 验证是否为管理员（服务端）
export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile()
  return profile?.role === 'admin'
}
```

---

## Task 8: 创建 src/middleware.ts

**Files:**
- Create: `src/middleware.ts`

**Step 1: 写入 Middleware（JWT 校验 + Admin 路由保护）**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 无需登录即可访问的路由
const PUBLIC_ROUTES = ['/login', '/register']
// Webhook 回调路由（不需要 JWT）
const WEBHOOK_ROUTES = ['/api/payment/webhook']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // Webhook 直接放行
  if (WEBHOOK_ROUTES.some(route => pathname.startsWith(route))) {
    return supabaseResponse
  }

  // 获取当前用户（通过 getUser 而非 getSession，更安全）
  const { data: { user } } = await supabase.auth.getUser()

  // 公开路由：已登录则重定向到首页
  if (PUBLIC_ROUTES.includes(pathname)) {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return supabaseResponse
  }

  // 未登录：重定向到登录页
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Admin 路由：额外验证角色
  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## Task 9: 创建 Auth 布局和登录页

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`

**Step 1: 写入 Auth 布局**

```tsx
// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🪨</div>
          <h1 className="text-2xl font-bold">Crusher · 碎石记</h1>
          <p className="text-sm text-zinc-500 mt-1">把碎片原石，碾成知识精矿</p>
        </div>
        {children}
      </div>
    </div>
  )
}
```

**Step 2: 写入登录页**

```tsx
// src/app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? '邮箱或密码错误'
        : '登录失败，请重试'
      )
      setLoading(false)
      return
    }

    toast.success('登录成功')
    router.push('/')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>登录</CardTitle>
        <CardDescription>使用邮箱和密码登录你的账号</CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </Button>
          <p className="text-sm text-zinc-500">
            还没有账号？{' '}
            <Link href="/register" className="text-zinc-900 font-medium hover:underline">
              立即注册
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
```

**Step 3: 写入注册页**

```tsx
// src/app/(auth)/register/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    if (password.length < 8) {
      toast.error('密码至少需要 8 位字符')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      toast.error(error.message === 'User already registered'
        ? '该邮箱已注册，请直接登录'
        : '注册失败，请重试'
      )
      setLoading(false)
      return
    }

    toast.success('注册成功，已自动登录')
    router.push('/')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>注册</CardTitle>
        <CardDescription>创建你的 Crusher 账号</CardDescription>
      </CardHeader>
      <form onSubmit={handleRegister}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="至少 8 位字符"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </Button>
          <p className="text-sm text-zinc-500">
            已有账号？{' '}
            <Link href="/login" className="text-zinc-900 font-medium hover:underline">
              立即登录
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
```

---

## Task 10: 更新 .env.example（补全所有必需变量）

**Files:**
- Modify: `.env.example`

**Step 1: 写入完整环境变量模板**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# DeepSeek LLM
DEEPSEEK_API_KEY=sk-...

# 虎皮椒支付
HUPIJIAO_PID=your_merchant_id
HUPIJIAO_KEY=your_signing_key
HUPIJIAO_NOTIFY_URL=https://your-domain.com/api/payment/webhook

# Upstash Redis（限流）
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# 应用
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Task 11: 验收检查

**Step 1: 启动开发服务器**

```bash
npm run dev
```

Expected: 服务器在 http://localhost:3000 启动，无编译错误

**Step 2: 验证路由保护**

- 访问 http://localhost:3000 → 应重定向到 /login
- 访问 http://localhost:3000/login → 显示登录表单

**Step 3: 验证注册流程（需已配置 Supabase 环境变量）**

- 访问 /register → 填写邮箱+密码 → 提交
- 成功后重定向到 /（目前显示 Landing Page）
- 再次访问 /login → 应重定向到 /（已登录）

**Step 4: 验证 Admin 保护**

- 访问 /admin → 应重定向到 /（普通用户无权）

---

## 执行完成后的提交

```bash
git add -A
git commit -m "feat: Day 1 基础设施 - 迁移 Supabase SSR、类型系统对齐、Middleware、登录注册页"
```
