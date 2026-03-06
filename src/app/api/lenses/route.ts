import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// 常量定义
const LENS_NAME_MIN = 1
const LENS_NAME_MAX = 50
const LENS_DESC_MAX = 200
const LENS_PROMPT_MIN = 10
const LENS_PROMPT_MAX = 5000
const DEFAULT_ICON = '🔧'
const MAX_LENSES_PER_USER = 10

// Zod 验证 Schema
const CreateLensSchema = z.object({
  name: z.string().min(LENS_NAME_MIN).max(LENS_NAME_MAX),
  icon: z.string().max(2).default(DEFAULT_ICON),
  description: z.string().max(LENS_DESC_MAX).optional(),
  system_prompt: z.string().min(LENS_PROMPT_MIN).max(LENS_PROMPT_MAX),
})

// 统一错误响应
function errorResponse(message: string, status: number): NextResponse {
  console.error('[Lenses API]', { message, status })
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

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse('未登录', 401)
    }

    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('custom_lenses')
      .select('id, name, icon, description, system_prompt, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      return errorResponse('查询失败，请重试', 500)
    }

    return successResponse(data ?? [])

  } catch (error) {
    console.error('[Lenses GET] Unexpected error:', error)
    return errorResponse('服务器内部错误', 500)
  }
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
    const parsed = CreateLensSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('参数验证失败', 400)
    }

    const supabase = await createClient()

    // 检查用户透镜数量限制
    const { count } = await (supabase as any)
      .from('custom_lenses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (count !== null && count !== undefined && count >= MAX_LENSES_PER_USER) {
      return errorResponse(`自定义透镜数量已达上限（${MAX_LENSES_PER_USER}个）`, 400)
    }

    // 创建透镜
    const { data, error } = await (supabase as any)
      .from('custom_lenses')
      .insert({ ...parsed.data, user_id: user.id })
      .select('id, name, icon, description, system_prompt, created_at')
      .single()

    if (error) {
      return errorResponse('创建失败，请重试', 500)
    }

    return successResponse(data, 201)

  } catch (error) {
    console.error('[Lenses POST] Unexpected error:', error)
    return errorResponse('服务器内部错误', 500)
  }
}
