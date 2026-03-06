import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// 安全的 URL 验证
function isValidSafeUrl(url: string | null | undefined): boolean {
  if (!url) return true  // 可选字段，空值通过

  try {
    const parsed = new URL(url)
    // 仅允许 http 和 https 协议，拒绝 javascript: 和 data:
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

// Zod 验证 Schema
const CreateFeedbackSchema = z.object({
  type: z.enum(['payment', 'bug', 'feature', 'other']),
  title: z.string().min(1).max(100).trim(),
  content: z.string().min(1).max(2000).trim(),
  context_url: z.string().max(500).optional().nullable()
    .refine(isValidSafeUrl, 'URL 必须使用 HTTP 或 HTTPS 协议'),
  related_order_id: z.string().uuid().optional().nullable(),
  related_insight_id: z.string().uuid().optional().nullable(),
})

// 统一错误响应
function errorResponse(message: string, status: number): NextResponse {
  console.error('[Feedbacks API]', { message, status })
  return NextResponse.json(
    { success: false, error: message },
    { status }
  )
}

// 统一成功响应
function successResponse(data: unknown, status: number = 200): NextResponse {
  return NextResponse.json(
    { success: true, data },
    { status }
  )
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse('未登录', 401)
    }

    // 解析请求体
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('请求体格式错误', 400)
    }

    // 验证输入
    const parsed = CreateFeedbackSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('参数验证失败', 400)
    }

    const supabase = await createClient()

    // 验证 related_order_id 归属（如果提供）
    if (parsed.data.related_order_id) {
      const { data: order } = await supabase
        .from('payment_orders')
        .select('id')
        .eq('id', parsed.data.related_order_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!order) {
        return errorResponse('关联的订单不存在或无权访问', 400)
      }
    }

    // 验证 related_insight_id 归属（如果提供）
    if (parsed.data.related_insight_id) {
      const { data: insight } = await supabase
        .from('insights')
        .select('id')
        .eq('id', parsed.data.related_insight_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!insight) {
        return errorResponse('关联的分析记录不存在或无权访问', 400)
      }
    }

    // 创建反馈
    const { data, error } = await supabase
      .from('feedbacks')
      .insert({ ...parsed.data, user_id: user.id })
      .select('id')
      .single()

    if (error) {
      return errorResponse('提交失败，请重试', 500)
    }

    return successResponse({ id: data.id }, 201)

  } catch (error) {
    console.error('[Feedbacks POST] Unexpected error:', error)
    return errorResponse('服务器内部错误', 500)
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse('未登录', 401)
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)  // 限制返回数量

    if (error) {
      return errorResponse('获取失败，请重试', 500)
    }

    return successResponse(data ?? [])

  } catch (error) {
    console.error('[Feedbacks GET] Unexpected error:', error)
    return errorResponse('服务器内部错误', 500)
  }
}
