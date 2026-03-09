// @ts-nocheck - Supabase 类型推断问题
// src/app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { deductCredits } from '@/lib/credits'
import { calculateCreditCost } from '@/types'

const CreateDocumentSchema = z.object({
  title: z.string().max(200).optional(),
  raw_content: z.string().min(1).max(50000),
  source_type: z.enum(['text', 'voice']).default('text'),
})

const ListDocumentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: '请求体格式错误' }, { status: 400 })
  }

  const parsed = CreateDocumentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 422 }
    )
  }

  const { title, raw_content, source_type } = parsed.data

  // title 为空时取内容前 20 字作为回退
  const resolvedTitle = title?.trim()
    ? title.trim()
    : raw_content.slice(0, 20).replace(/\s+/g, ' ').trim()

  // 服务端计算 char_count 和积分费用
  const char_count = raw_content.length
  const creditCost = calculateCreditCost(char_count)

  // 扣减积分（创建文档按字数收费）
  const deductResult = await deductCredits(
    user.id,
    creditCost,
    `新建文档：${resolvedTitle}`
  )

  if (!deductResult.success) {
    const isInsufficient = deductResult.reason === 'insufficient_credits'
    return NextResponse.json(
      { success: false, error: isInsufficient ? '积分不足，请前往充值' : '扣费失败，请重试' },
      { status: isInsufficient ? 402 : 500 }
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      title: resolvedTitle,
      raw_content,
      char_count,
      source_type,
    })
    .select('id, title')
    .single()

  if (error) {
    return NextResponse.json(
      { success: false, error: '创建失败，请重试' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = ListDocumentsSchema.safeParse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: '参数错误' },
      { status: 422 }
    )
  }

  const { page, limit } = parsed.data
  const from = (page - 1) * limit
  const to = from + limit - 1

  const supabase = await createClient()
  const { data, error, count } = await supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    return NextResponse.json(
      { success: false, error: '获取失败，请重试' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data,
    meta: { total: count ?? 0, page, limit },
  })
}