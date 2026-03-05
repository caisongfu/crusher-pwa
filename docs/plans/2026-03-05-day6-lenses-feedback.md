# Day 6：自定义透镜 + 反馈系统 + 公告展示 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现自定义透镜 CRUD、完整的用户反馈系统（含 4 个触发入口）以及前端公告横幅展示。

**Architecture:** 三个相对独立的功能模块：（1）自定义透镜：`/api/lenses` CRUD API + `/lenses` 管理页 + LensForm Dialog 组件；（2）反馈系统：`/api/feedbacks` API + 通用 `FeedbackDialog` 组件 + 4 个触发入口挂载；（3）公告展示：`(main)/layout.tsx` 服务端查询 + `AnnouncementBanner` 客户端组件（localStorage 记录已读）。

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (PostgreSQL + RLS), React Hook Form + Zod, Shadcn/UI (Dialog/Form/DropdownMenu), Tailwind CSS, Sonner (toast)

---

## 依赖关系图

```
Task 1: 自定义透镜 API（/api/lenses）
    ↓
Task 2: 自定义透镜管理页 + LensForm（/lenses）
    ↓
Task 3: LensSelector 扩展（追加自定义透镜）
Task 4: /api/insights 扩展（支持 custom lens_type）

Task 5: 反馈 API（/api/feedbacks）
    ↓
Task 6: FeedbackDialog 组件
    ↓
Task 7: 4 个反馈触发入口挂载
Task 8: Profile 页反馈 Tab

Task 9: 公告横幅（AnnouncementBanner + (main)/layout.tsx 扩展）
Task 10: Admin 公告管理页（/admin/announcements）
```

---

## Task 1：自定义透镜 API

**Files:**
- Create: `src/app/api/lenses/route.ts`
- Create: `src/app/api/lenses/[id]/route.ts`

### Step 1：创建 `src/app/api/lenses/route.ts`

```typescript
// src/app/api/lenses/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CreateLensSchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().default('🔧'),
  description: z.string().max(200).optional(),
  system_prompt: z.string().min(10).max(5000),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('custom_lenses')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreateLensSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('custom_lenses')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
```

### Step 2：创建 `src/app/api/lenses/[id]/route.ts`

```typescript
// src/app/api/lenses/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const UpdateLensSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().optional(),
  description: z.string().max(200).nullable().optional(),
  system_prompt: z.string().min(10).max(5000).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = UpdateLensSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('custom_lenses')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)  // RLS 双重保障
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 软删除：is_active = false
  const { error } = await supabase
    .from('custom_lenses')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
```

### Step 3：手动验证 API（curl 或浏览器 DevTools，无需自动化测试）

```bash
# 在 dev 环境启动后，用 Cookie 验证（需要先登录获取 session）
# GET /api/lenses 应返回 { data: [] }
# POST /api/lenses 应返回 { data: { id, name, ... } }
# PATCH /api/lenses/[id] 应返回更新后的 lens
# DELETE /api/lenses/[id] 应返回 204
```

### Step 4：Commit

```bash
git add src/app/api/lenses/route.ts src/app/api/lenses/[id]/route.ts
git commit -m "feat: add custom lenses CRUD API"
```

---

## Task 2：LensForm 组件 + 自定义透镜管理页

**Files:**
- Create: `src/components/lens-form.tsx`
- Create: `src/app/(main)/lenses/page.tsx`

### Step 1：创建 `src/components/lens-form.tsx`

LensForm 是一个可复用的 Dialog，支持创建和编辑两种模式。

```typescript
// src/components/lens-form.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { CustomLens } from '@/types'

const COMMON_EMOJIS = ['🔧', '📊', '✍️', '🎯', '📌', '💡', '🔍', '📝', '⚡', '🚀',
  '🌟', '🎨', '📋', '🔬', '💼', '📈', '🎭', '🧩', '🔮', '🌈']

const schema = z.object({
  name: z.string().min(1, '名称必填').max(50, '最多50字'),
  icon: z.string().default('🔧'),
  description: z.string().max(200, '最多200字').optional(),
  system_prompt: z.string().min(10, '系统提示词至少10字').max(5000, '最多5000字'),
})

type FormValues = z.infer<typeof schema>

interface LensFormProps {
  lens?: CustomLens           // 编辑时传入；不传则为创建
  trigger: React.ReactNode
  onSuccess: () => void
}

export function LensForm({ lens, trigger, onSuccess }: LensFormProps) {
  const [open, setOpen] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const isEditing = !!lens

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: lens?.name ?? '',
      icon: lens?.icon ?? '🔧',
      description: lens?.description ?? '',
      system_prompt: lens?.system_prompt ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      const url = isEditing ? `/api/lenses/${lens.id}` : '/api/lenses'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? '操作失败')
      }

      toast.success(isEditing ? '透镜已更新' : '透镜已创建')
      setOpen(false)
      form.reset()
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑透镜' : '新建自定义透镜'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Icon Picker */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>图标</FormLabel>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                      className="text-2xl border rounded p-2 hover:bg-zinc-50"
                    >
                      {field.value}
                    </button>
                    {emojiPickerOpen && (
                      <div className="flex flex-wrap gap-1 p-2 border rounded bg-white shadow-sm max-w-48">
                        {COMMON_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="text-xl hover:bg-zinc-100 rounded p-1"
                            onClick={() => {
                              field.onChange(emoji)
                              setEmojiPickerOpen(false)
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                        <Input
                          placeholder="其他"
                          className="h-8 w-20 text-center"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const val = (e.target as HTMLInputElement).value
                              if (val) {
                                field.onChange(val)
                                setEmojiPickerOpen(false)
                              }
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </FormItem>
              )}
            />

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名称 <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="周报整理" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述（可选）</FormLabel>
                  <FormControl>
                    <Input placeholder="简短描述这个透镜的用途" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* System Prompt */}
            <FormField
              control={form.control}
              name="system_prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="你是一个...请帮我分析以下内容：&#10;&#10;{content}"
                      className="min-h-[120px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-zinc-400">使用 {'{content}'} 作为内容占位符</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

### Step 2：创建 `src/app/(main)/lenses/page.tsx`

```typescript
// src/app/(main)/lenses/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LensForm } from '@/components/lens-form'
import type { CustomLens } from '@/types'

// 内置透镜（只读展示）
const BUILT_IN_LENSES = [
  { icon: '📋', name: '甲方需求整理' },
  { icon: '📝', name: '会议纪要' },
  { icon: '🔍', name: '需求评审' },
  { icon: '⚠️', name: '风险识别' },
  { icon: '📊', name: '变更影响分析' },
  { icon: '🐛', name: '问题复盘' },
  { icon: '📖', name: '技术决策记录' },
]

export default function LensesPage() {
  const [lenses, setLenses] = useState<CustomLens[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLenses = useCallback(async () => {
    try {
      const res = await fetch('/api/lenses')
      const { data } = await res.json()
      setLenses(data ?? [])
    } catch {
      toast.error('加载透镜列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLenses() }, [fetchLenses])

  async function handleDelete(id: string) {
    if (!confirm('确定删除这个透镜吗？')) return
    try {
      const res = await fetch(`/api/lenses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('删除失败')
      toast.success('透镜已删除')
      setLenses(prev => prev.filter(l => l.id !== id))
    } catch {
      toast.error('删除失败')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">透镜管理</h1>
        <LensForm
          trigger={
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              新建自定义透镜
            </Button>
          }
          onSuccess={fetchLenses}
        />
      </div>

      {/* Custom Lenses */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
          我的自定义透镜
        </h2>
        {loading ? (
          <p className="text-zinc-400 text-sm">加载中...</p>
        ) : lenses.length === 0 ? (
          <p className="text-zinc-400 text-sm">还没有自定义透镜，点击右上角新建一个</p>
        ) : (
          <ul className="space-y-2">
            {lenses.map((lens) => (
              <li
                key={lens.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-white"
              >
                <span className="text-2xl">{lens.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{lens.name}</p>
                  {lens.description && (
                    <p className="text-sm text-zinc-400 truncate">{lens.description}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <LensForm
                    lens={lens}
                    trigger={
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                    onSuccess={fetchLenses}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(lens.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Built-in Lenses (read-only) */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
          内置透镜（只读）
        </h2>
        <ul className="space-y-2">
          {BUILT_IN_LENSES.map((lens) => (
            <li
              key={lens.name}
              className="flex items-center gap-3 p-3 border rounded-lg bg-zinc-50 text-zinc-500"
            >
              <span className="text-2xl">{lens.icon}</span>
              <p className="font-medium">{lens.name}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
```

### Step 3：Commit

```bash
git add src/components/lens-form.tsx "src/app/(main)/lenses/page.tsx"
git commit -m "feat: add custom lens management page and LensForm dialog"
```

---

## Task 3：扩展 LensSelector 支持自定义透镜

**Files:**
- Modify: `src/components/lens-selector.tsx`（如果此文件不存在则创建）

> **注意：** 此文件可能在 Day 4 中已创建。先检查是否存在。

### Step 1：检查文件

```bash
ls src/components/lens-selector.tsx
```

### Step 2：如果文件不存在，创建 `src/components/lens-selector.tsx`

如果已存在，在内置透镜列表后面追加自定义透镜部分。

```typescript
// src/components/lens-selector.tsx
'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { CustomLens, LensType } from '@/types'

interface LensOption {
  type: LensType
  icon: string
  label: string
  customLensId?: string
}

const BUILT_IN_LENSES: LensOption[] = [
  { type: 'requirements', icon: '📋', label: '甲方需求' },
  { type: 'meeting', icon: '📝', label: '会议纪要' },
  { type: 'review', icon: '🔍', label: '需求评审' },
  { type: 'risk', icon: '⚠️', label: '风险识别' },
  { type: 'change', icon: '📊', label: '变更影响' },
  { type: 'postmortem', icon: '🐛', label: '问题复盘' },
  { type: 'tech', icon: '📖', label: '技术决策' },
]

interface LensSelectorProps {
  value: { lensType: LensType; customLensId?: string } | null
  onChange: (value: { lensType: LensType; customLensId?: string }) => void
}

export function LensSelector({ value, onChange }: LensSelectorProps) {
  const [customLenses, setCustomLenses] = useState<CustomLens[]>([])

  useEffect(() => {
    fetch('/api/lenses')
      .then(r => r.json())
      .then(({ data }) => setCustomLenses(data ?? []))
      .catch(() => {/* 静默失败，显示内置透镜即可 */})
  }, [])

  const allLenses: LensOption[] = [
    ...BUILT_IN_LENSES,
    ...customLenses.map(lens => ({
      type: 'custom' as LensType,
      icon: lens.icon,
      label: lens.name,
      customLensId: lens.id,
    })),
  ]

  return (
    <div className="flex gap-2 flex-wrap">
      {allLenses.map((lens) => {
        const isSelected =
          value?.lensType === lens.type &&
          value?.customLensId === lens.customLensId

        return (
          <button
            key={`${lens.type}-${lens.customLensId ?? ''}`}
            type="button"
            onClick={() => onChange({ lensType: lens.type, customLensId: lens.customLensId })}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors',
              isSelected
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
            )}
          >
            <span>{lens.icon}</span>
            <span>{lens.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

### Step 3：Commit

```bash
git add src/components/lens-selector.tsx
git commit -m "feat: extend LensSelector to show custom lenses"
```

---

## Task 4：扩展 /api/insights 支持自定义透镜

**Files:**
- Modify: `src/app/api/insights/route.ts`（如果此文件不存在则创建基础版本）

> **注意：** 如果 `insights/route.ts` 已存在（Day 4 实现），只需在其中的 `resolvePrompt` 部分扩展 custom 分支。

### Step 1：检查文件

```bash
ls src/app/api/insights/route.ts
```

### Step 2：如果文件不存在，创建 `src/app/api/insights/route.ts`

如果文件存在，找到 prompt 解析逻辑，在 lens_type 为 'custom' 时从数据库查询 custom_lens。

```typescript
// src/app/api/insights/route.ts 中，扩展以下 resolvePrompt 函数：

async function resolvePrompt(
  lensType: string,
  customLensId: string | null,
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string
): Promise<{ system: string; userTemplate: string }> {
  if (lensType === 'custom' && customLensId) {
    // 从数据库读取自定义透镜 prompt
    const { data: lens, error } = await supabase
      .from('custom_lenses')
      .select('system_prompt')
      .eq('id', customLensId)
      .eq('user_id', userId)     // 安全：只能使用自己的透镜
      .eq('is_active', true)
      .single()

    if (error || !lens) {
      throw new Error('自定义透镜不存在或无权访问')
    }

    return {
      system: lens.system_prompt,
      userTemplate: '{content}',  // 直接将内容替换 {content} 占位符
    }
  }

  // 内置透镜：从 system_prompts 表读取（或 fallback 到代码中的默认值）
  // ... 已有逻辑
}
```

### Step 3：Commit

```bash
git add src/app/api/insights/route.ts
git commit -m "feat: support custom lens type in insights API"
```

---

## Task 5：反馈 API

**Files:**
- Create: `src/app/api/feedbacks/route.ts`

### Step 1：创建 `src/app/api/feedbacks/route.ts`

```typescript
// src/app/api/feedbacks/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CreateFeedbackSchema = z.object({
  type: z.enum(['payment', 'bug', 'feature', 'other']),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  context_url: z.string().url().optional().nullable(),
  related_order_id: z.string().uuid().optional().nullable(),
  related_insight_id: z.string().uuid().optional().nullable(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreateFeedbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('feedbacks')
    .insert({ ...parsed.data, user_id: user.id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('feedbacks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

### Step 2：Commit

```bash
git add src/app/api/feedbacks/route.ts
git commit -m "feat: add feedbacks API (POST create, GET list)"
```

---

## Task 6：FeedbackDialog 组件

**Files:**
- Create: `src/components/feedback-dialog.tsx`

### Step 1：创建 `src/components/feedback-dialog.tsx`

```typescript
// src/components/feedback-dialog.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FeedbackType } from '@/types'

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: string }[] = [
  { value: 'payment', label: '支付问题', icon: '💳' },
  { value: 'bug', label: 'Bug 报告', icon: '🐛' },
  { value: 'feature', label: '功能建议', icon: '💡' },
  { value: 'other', label: '其他', icon: '📝' },
]

const schema = z.object({
  type: z.enum(['payment', 'bug', 'feature', 'other']),
  title: z.string().min(1, '标题必填').max(100, '最多100字'),
  content: z.string().min(1, '详情必填').max(2000, '最多2000字'),
})

type FormValues = z.infer<typeof schema>

interface FeedbackDialogProps {
  trigger?: React.ReactNode
  defaultType?: FeedbackType
  defaultContextUrl?: string
  defaultRelatedOrderId?: string
  defaultRelatedInsightId?: string
}

export function FeedbackDialog({
  trigger,
  defaultType = 'other',
  defaultContextUrl,
  defaultRelatedOrderId,
  defaultRelatedInsightId,
}: FeedbackDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: defaultType, title: '', content: '' },
  })

  const content = form.watch('content')

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          context_url: defaultContextUrl ?? null,
          related_order_id: defaultRelatedOrderId ?? null,
          related_insight_id: defaultRelatedInsightId ?? null,
        }),
      })

      if (!res.ok) throw new Error('提交失败')
      toast.success('反馈已提交，感谢您的反馈！')
      setOpen(false)
      form.reset()
    } catch {
      toast.error('提交失败，请稍后再试')
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">提交反馈</Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>提交反馈</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type Selector */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>类型 <span className="text-red-500">*</span></FormLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {FEEDBACK_TYPES.map(({ value, label, icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className={cn(
                          'flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors',
                          field.value === value
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 hover:border-zinc-400'
                        )}
                      >
                        <span className="text-lg">{icon}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标题 <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="一句话描述问题" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>详情 <span className="text-red-500">*</span></FormLabel>
                    <span className="text-xs text-zinc-400">{content.length}/2000</span>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="请详细描述您遇到的问题或建议..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Context Info (read-only) */}
            {(defaultContextUrl || defaultRelatedOrderId || defaultRelatedInsightId) && (
              <div className="text-xs text-zinc-400 bg-zinc-50 rounded p-2 space-y-1">
                <p className="font-medium">关联信息（自动填充）</p>
                {defaultContextUrl && <p>页面：{defaultContextUrl}</p>}
                {defaultRelatedOrderId && <p>订单号：{defaultRelatedOrderId}</p>}
                {defaultRelatedInsightId && <p>分析 ID：{defaultRelatedInsightId}</p>}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '提交中...' : '提交'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

### Step 2：Commit

```bash
git add src/components/feedback-dialog.tsx
git commit -m "feat: add FeedbackDialog component with type selector and context auto-fill"
```

---

## Task 7：挂载 4 个反馈触发入口

### 入口 1：全局浮动 `?` 按钮

**Files:**
- Create: `src/components/feedback-button.tsx`
- Modify: `src/app/(main)/layout.tsx`

#### Step 1：创建 `src/components/feedback-button.tsx`

```typescript
// src/components/feedback-button.tsx
'use client'

import { usePathname } from 'next/navigation'
import { FeedbackDialog } from '@/components/feedback-dialog'
import { Button } from '@/components/ui/button'

export function FeedbackButton() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40">
      <FeedbackDialog
        defaultType="bug"
        defaultContextUrl={pathname}
        trigger={
          <Button
            size="icon"
            variant="outline"
            className="h-10 w-10 rounded-full shadow-md bg-white"
            title="提交反馈"
          >
            ?
          </Button>
        }
      />
    </div>
  )
}
```

#### Step 2：在 `src/app/(main)/layout.tsx` 中引入 FeedbackButton

找到已有的 `(main)/layout.tsx`，在 `<main>` 标签后（children 之后）添加：

```typescript
// 在 (main)/layout.tsx 中，children 渲染之后添加：
import { FeedbackButton } from '@/components/feedback-button'

// 在 JSX 中添加（与 Sidebar、TopBar 同级）：
<FeedbackButton />
```

完整的 layout.tsx 结构应为：
```typescript
// src/app/(main)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'  // 如果 Day 2 已创建
import { FeedbackButton } from '@/components/feedback-button'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="min-h-screen bg-zinc-50">
      <TopBar profile={profile} />
      <Sidebar />
      <main className="pt-14 md:ml-60 pb-16 md:pb-0">
        {children}
      </main>
      <FeedbackButton />
      {/* BottomNav 如果 Day 2 已创建 */}
    </div>
  )
}
```

#### Step 3：Commit

```bash
git add src/components/feedback-button.tsx "src/app/(main)/layout.tsx"
git commit -m "feat: add global floating feedback button"
```

---

### 入口 2：Profile → 我的反馈 Tab（见 Task 8）

### 入口 3：InsightResult `···` 菜单

**Files:**
- Modify: `src/components/insight-result.tsx`（如果此文件存在，否则跳过）

```typescript
// 在 insight-result.tsx 的 DropdownMenu 中添加：
import { FeedbackDialog } from '@/components/feedback-dialog'

// 在 DropdownMenuContent 中添加：
<DropdownMenuSeparator />
<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
  <FeedbackDialog
    defaultType="other"
    defaultRelatedInsightId={insight.id}
    trigger={<span className="w-full text-left text-sm">反馈内容问题</span>}
  />
</DropdownMenuItem>
```

#### Step 4：Commit

```bash
git add src/components/insight-result.tsx
git commit -m "feat: add feedback entry in InsightResult dropdown"
```

---

## Task 8：Profile 页 → 我的反馈 Tab

**Files:**
- Create: `src/app/(main)/profile/page.tsx`（如果已有则修改）

### Step 1：创建/修改 Profile 页面（含我的反馈 Tab）

```typescript
// src/app/(main)/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfilePageClient } from './profile-client'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return <ProfilePageClient profile={profile} />
}
```

### Step 2：创建 `src/app/(main)/profile/profile-client.tsx`

```typescript
// src/app/(main)/profile/profile-client.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FeedbackDialog } from '@/components/feedback-dialog'
import type { Profile, Feedback, FeedbackStatus } from '@/types'

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; color: string }> = {
  pending: { label: '⏳ 待处理', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: '🔄 处理中', color: 'bg-blue-100 text-blue-800' },
  resolved: { label: '✅ 已解决', color: 'bg-green-100 text-green-800' },
  closed: { label: '🚫 已关闭', color: 'bg-zinc-100 text-zinc-600' },
}

const TYPE_LABELS: Record<string, string> = {
  payment: '💳 支付问题',
  bug: '🐛 Bug报告',
  feature: '💡 功能建议',
  other: '📝 其他',
}

const STATUS_FILTERS: { value: FeedbackStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' },
]

interface ProfilePageClientProps {
  profile: Profile
}

type ActiveTab = 'info' | 'feedbacks'

export function ProfilePageClient({ profile }: ProfilePageClientProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('info')
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all')
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false)

  const fetchFeedbacks = useCallback(async () => {
    setLoadingFeedbacks(true)
    try {
      const res = await fetch('/api/feedbacks')
      const { data } = await res.json()
      setFeedbacks(data ?? [])
    } catch {
      toast.error('加载反馈失败')
    } finally {
      setLoadingFeedbacks(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'feedbacks') fetchFeedbacks()
  }, [activeTab, fetchFeedbacks])

  const filteredFeedbacks = statusFilter === 'all'
    ? feedbacks
    : feedbacks.filter(f => f.status === statusFilter)

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      {/* Profile Header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-zinc-200 flex items-center justify-center text-2xl font-bold text-zinc-600">
          {profile.username?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div>
          <h1 className="text-xl font-bold">{profile.username ?? '用户'}</h1>
          <p className="text-zinc-500 text-sm">积分余额：{profile.credits}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6 gap-4">
        {(['info', 'feedbacks'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            {tab === 'info' ? '基本信息' : '我的反馈'}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-zinc-500">当前积分</p>
            <p className="text-3xl font-bold">{profile.credits}</p>
          </div>
          <Button variant="outline" className="w-full" disabled>
            充值积分（功能开发中，如需充值请联系管理员）
          </Button>
        </div>
      )}

      {/* Tab: Feedbacks */}
      {activeTab === 'feedbacks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 flex-wrap">
              {STATUS_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    statusFilter === value
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <FeedbackDialog
              trigger={<Button size="sm" variant="outline">新建反馈</Button>}
              onSuccess={fetchFeedbacks}
            />
          </div>

          {loadingFeedbacks ? (
            <p className="text-zinc-400 text-sm text-center py-8">加载中...</p>
          ) : filteredFeedbacks.length === 0 ? (
            <p className="text-zinc-400 text-sm text-center py-8">暂无反馈记录</p>
          ) : (
            <ul className="space-y-3">
              {filteredFeedbacks.map((feedback) => {
                const statusConf = STATUS_CONFIG[feedback.status]
                return (
                  <li key={feedback.id} className="border rounded-lg p-4 bg-white space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs text-zinc-400">
                          {TYPE_LABELS[feedback.type]}
                        </span>
                        <p className="font-medium mt-0.5">{feedback.title}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusConf.color}`}>
                        {statusConf.label}
                      </span>
                    </div>
                    {(feedback.status === 'resolved' || feedback.status === 'closed') && feedback.admin_note && (
                      <div className="text-sm text-zinc-600 bg-zinc-50 rounded p-2">
                        <p className="text-xs text-zinc-400 mb-1">管理员回复</p>
                        <p>{feedback.admin_note}</p>
                      </div>
                    )}
                    <p className="text-xs text-zinc-400">
                      {new Date(feedback.created_at).toLocaleString('zh-CN')}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
```

> **注意：** `FeedbackDialog` 的 `onSuccess` 属性需要在组件接口中添加（或将 `fetchFeedbacks` 传入）。如果 `FeedbackDialog` 不支持此 prop，可通过在对话框关闭时刷新列表来实现。

### Step 3：Commit

```bash
git add "src/app/(main)/profile/page.tsx" "src/app/(main)/profile/profile-client.tsx"
git commit -m "feat: add Profile page with My Feedbacks tab"
```

---

### 入口 4：积分流水中异常订单行（在 Profile 页 info tab 中）

如果 Profile 页有消费记录/订单列表，在状态为 `failed` 或 `pending` 超过 1 小时的订单行后添加：

```typescript
// 在显示订单行的组件中，条件性渲染：
{(order.status === 'failed' ||
  (order.status === 'pending' &&
   Date.now() - new Date(order.created_at).getTime() > 3600000)) && (
  <FeedbackDialog
    defaultType="payment"
    defaultRelatedOrderId={order.id}
    trigger={
      <button className="text-xs text-zinc-400 hover:underline ml-1">有问题？</button>
    }
  />
)}
```

---

## Task 9：公告横幅

**Files:**
- Create: `src/components/announcement-banner.tsx`
- Modify: `src/app/(main)/layout.tsx`

### Step 1：创建 `src/components/announcement-banner.tsx`

```typescript
// src/components/announcement-banner.tsx
'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Announcement, AnnouncementType } from '@/types'

const TYPE_STYLES: Record<AnnouncementType, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-orange-50 border-orange-200 text-orange-800',
  maintenance: 'bg-red-50 border-red-200 text-red-800',
}

const TYPE_ICONS: Record<AnnouncementType, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  maintenance: '🔴',
}

interface AnnouncementBannerProps {
  announcements: Announcement[]
}

export function AnnouncementBanner({ announcements }: AnnouncementBannerProps) {
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    // 从 localStorage 读取已关闭的公告 ID
    try {
      const stored = localStorage.getItem('crusher_dismissed_announcements')
      if (stored) setDismissed(JSON.parse(stored))
    } catch {
      // 忽略
    }
  }, [])

  function dismiss(id: string) {
    const next = [...dismissed, id]
    setDismissed(next)
    try {
      localStorage.setItem('crusher_dismissed_announcements', JSON.stringify(next))
    } catch {
      // 忽略
    }
  }

  const visible = announcements.filter(a => !dismissed.includes(a.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-1">
      {visible.map((announcement) => (
        <div
          key={announcement.id}
          className={cn(
            'flex items-center gap-3 px-4 py-2 border text-sm',
            TYPE_STYLES[announcement.type]
          )}
        >
          <span>{TYPE_ICONS[announcement.type]}</span>
          <span className="flex-1">{announcement.content}</span>
          <button
            onClick={() => dismiss(announcement.id)}
            className="shrink-0 opacity-60 hover:opacity-100"
            aria-label="关闭公告"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
```

### Step 2：在 `(main)/layout.tsx` 中查询公告并渲染

```typescript
// 在 (main)/layout.tsx 中添加公告查询和渲染

// 添加以下查询（在 profile 查询之后）：
const { data: announcements } = await supabase
  .from('announcements')
  .select('*')
  .eq('is_active', true)
  .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
  .order('created_at', { ascending: false })

// 在 JSX 中，main 标签之前（TopBar 之后）添加：
import { AnnouncementBanner } from '@/components/announcement-banner'

// 在 <main> 之前或 main 内容区顶部渲染：
<AnnouncementBanner announcements={announcements ?? []} />
```

完整结构：
```typescript
<div className="min-h-screen bg-zinc-50">
  <TopBar profile={profile} />
  <Sidebar />
  <main className="pt-14 md:ml-60 pb-16 md:pb-0">
    <AnnouncementBanner announcements={announcements ?? []} />
    {children}
  </main>
  <FeedbackButton />
</div>
```

### Step 3：Commit

```bash
git add src/components/announcement-banner.tsx "src/app/(main)/layout.tsx"
git commit -m "feat: add AnnouncementBanner with localStorage dismiss"
```

---

## Task 10：Admin 公告管理页（基础版）

**Files:**
- Create: `src/app/admin/announcements/page.tsx`

### Step 1：创建 `src/app/admin/announcements/page.tsx`

```typescript
// src/app/admin/announcements/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { Announcement, AnnouncementType } from '@/types'

const TYPE_STYLES: Record<AnnouncementType, string> = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-orange-100 text-orange-800',
  maintenance: 'bg-red-100 text-red-800',
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'info' as AnnouncementType,
    expires_at: '',
  })

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  async function fetchAnnouncements() {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
      setAnnouncements(data ?? [])
    } catch {
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!form.title || !form.content) {
      toast.error('标题和内容必填')
      return
    }
    setCreating(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.from('announcements').insert({
        title: form.title,
        content: form.content,
        type: form.type,
        expires_at: form.expires_at || null,
      })
      if (error) throw error
      toast.success('公告已创建')
      setCreateOpen(false)
      setForm({ title: '', content: '', type: 'info', expires_at: '' })
      fetchAnnouncements()
    } catch {
      toast.error('创建失败')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeactivate(id: string) {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
      toast.success('公告已停用')
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_active: false } : a))
    } catch {
      toast.error('操作失败')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">系统公告</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              新建公告
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建公告</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">标题</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="公告标题"
                />
              </div>
              <div>
                <label className="text-sm font-medium">内容</label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="公告内容（显示在横幅上）"
                />
              </div>
              <div>
                <label className="text-sm font-medium">类型</label>
                <div className="flex gap-2 mt-1">
                  {(['info', 'warning', 'maintenance'] as AnnouncementType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`px-3 py-1 rounded text-sm border ${
                        form.type === t ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">到期时间（可选）</label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? '创建中...' : '创建'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-zinc-400">加载中...</p>
      ) : (
        <div className="border rounded-lg divide-y bg-white">
          {announcements.length === 0 && (
            <p className="text-zinc-400 text-center py-8">暂无公告</p>
          )}
          {announcements.map((announcement) => (
            <div key={announcement.id} className="flex items-center gap-4 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{announcement.title}</p>
                  <Badge className={TYPE_STYLES[announcement.type]}>
                    {announcement.type}
                  </Badge>
                  {!announcement.is_active && (
                    <Badge className="bg-zinc-100 text-zinc-500">已停用</Badge>
                  )}
                </div>
                <p className="text-sm text-zinc-500 mt-1">{announcement.content}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  创建：{new Date(announcement.created_at).toLocaleString('zh-CN')}
                  {announcement.expires_at && ` · 到期：${new Date(announcement.expires_at).toLocaleString('zh-CN')}`}
                </p>
              </div>
              {announcement.is_active && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeactivate(announcement.id)}
                >
                  停用
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Step 2：Commit

```bash
git add src/app/admin/announcements/page.tsx
git commit -m "feat: add admin announcements management page (basic)"
```

---

## Task 11：验收验证

### 验收清单

在浏览器中逐项验证：

```markdown
自定义透镜：
□ /lenses 页面加载正常，内置透镜和自定义透镜区分显示
□ 点击"新建自定义透镜"，填写表单后保存，列表刷新
□ 编辑已有透镜，修改名称/图标/prompt 后保存
□ 删除透镜后不再显示（确认弹窗）
□ 文档详情页 LensSelector 中可见自定义透镜（在内置透镜之后）
□ 选择自定义透镜可触发 AI 分析（需要 Day 4 API 已完成）

反馈系统：
□ 页面右下角浮动 ? 按钮存在，点击弹出反馈表单（预填 context_url = 当前路径）
□ Profile → 我的反馈 Tab 可查看反馈列表
□ Profile → 新建反馈按钮可打开表单（无预填）
□ 提交反馈后出现 toast 提示，列表刷新

公告展示：
□ /admin/announcements 页面可创建公告
□ 创建 info/warning/maintenance 类型公告后，主应用顶部显示对应颜色横幅
□ 点击 × 按钮关闭公告，刷新页面后不再显示（localStorage 记录）
□ 停用公告后横幅不再显示（需要清除 localStorage 或用新 ID 的公告测试）
```

### Step 1：启动开发服务器

```bash
npm run dev
```

### Step 2：逐项验证，记录问题

### Step 3：Final Commit

```bash
git add -A
git commit -m "feat: Day 6 - custom lenses, feedback system, announcement banner"
```

---

## 依赖关系说明

- **Day 4 关联**：Task 4 的 `/api/insights` 扩展依赖 Day 4 的 insights API。如果 Day 4 尚未完成，Task 4 可跳过，等 Day 4 完成后补做。
- **Task 3 关联**：LensSelector 如果 Day 4 已创建，则修改现有文件；如果不存在则新建。
- **Supabase 数据库**：`custom_lenses`、`feedbacks`、`announcements` 表需要在 Supabase 中已创建（Day 1 任务）。如果未创建，需要先执行对应的 migration SQL。

### 确认数据库表存在

```sql
-- 在 Supabase SQL Editor 中执行，确认表存在：
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('custom_lenses', 'feedbacks', 'announcements');
```

如果不存在，参考 PROJECT.md 中的 SQL 创建对应表。
