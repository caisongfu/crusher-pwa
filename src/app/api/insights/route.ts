import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import { deepseekModel } from '@/lib/deepseek'
import { checkRateLimit } from '@/lib/rate-limit'
import { deductCredits } from '@/lib/credits'
import { resolvePrompt } from '@/lib/prompts'
import { calculateCreditCost } from '@/types'
import type { LensType } from '@/types'

const InsightRequestSchema = z.object({
  documentId: z.string().uuid(),
  lensType: z.enum(['requirements', 'meeting', 'review', 'risk', 'change', 'postmortem', 'tech', 'custom']),
  customLensId: z.string().uuid().optional(),
})

type DocRow = Database['public']['Tables']['documents']['Row']
type InsightRow = Database['public']['Tables']['insights']['Insert']

// POST /api/insights — 流式 AI 分析
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = await createClient()

  // 获取用户积分以确定限流额度
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return new Response('用户不存在', { status: 404 })
  }

  // 动态限流检查
  const rateLimitResult = await checkRateLimit(user.id, (profile as any).credits)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: rateLimitResult.message,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      },
      { status: 429 }
    )
  }

  // 参数校验
  const body = await request.json()
  const parsed = InsightRequestSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(parsed.error.message, { status: 400 })
  }

  const { documentId, lensType, customLensId } = parsed.data


  // 获取文档并验证归属
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, raw_content, char_count, user_id')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .single() as any

  if (docError || !doc) {
    return new Response('Document not found', { status: 404 })
  }

  const typedDoc = doc as DocRow

  // 计算积分费用
  const creditCost = calculateCreditCost(typedDoc.char_count)

  // 预先扣减积分（流式输出前扣减，防止滥用）
  const deductResult = await deductCredits(
    user.id,
    creditCost,
    `使用${lensType}透镜分析文档`
  )

  if (!deductResult.success) {
    return new Response('Payment Required', { status: 402 })
  }

  // 解析 prompt
  const { system, userPrompt, promptVersion } = await resolvePrompt(
    lensType as LensType,
    typedDoc.raw_content,
    customLensId
  )

  // 流式调用 DeepSeek
  const result = streamText({
    model: deepseekModel as any,
    system,
    prompt: userPrompt,
    async onFinish({ text, usage }) {
      // 保存 insight 记录到 DB
      const insertData: InsightRow = {
        document_id: documentId,
        user_id: user.id,
        lens_type: lensType,
        custom_lens_id: customLensId ?? null,
        result: text,
        model: 'deepseek-chat',
        prompt_version: promptVersion,
        input_chars: typedDoc.char_count,
        input_tokens: usage?.promptTokens ?? null,
        output_tokens: usage?.completionTokens ?? null,
        credits_cost: creditCost,
      }

      const { error: insertError } = await supabase
        .from('insights')
        .insert(insertData as any)

      if (insertError) {
        console.error('Failed to insert insight:', insertError)
      }

      // 使用 insight ID 更新 credit_transactions（需二次更新 deduct_credits 不支持，暂跳过）
    },
  })

  return result.toDataStreamResponse()
}

// GET /api/insights?documentId=xxx — 获取文档历史 insights
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')

  if (!documentId) {
    return new Response('Missing documentId', { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('insights')
    .select('*')
    .eq('document_id', documentId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ insights: data })
}
