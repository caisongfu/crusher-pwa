import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// 常量定义
const LENS_NAME_MIN = 1
const LENS_NAME_MAX = 50
const LENS_DESC_MAX = 200
const LENS_PROMPT_MIN = 10
const LENS_PROMPT_MAX = 5000

// Zod 验证 Schema
const UpdateLensSchema = z.object({
  name: z.string().min(LENS_NAME_MIN).max(LENS_NAME_MAX).optional(),
  icon: z.string().max(2).optional(),
  description: z.string().max(LENS_DESC_MAX).nullable().optional(),
  system_prompt: z.string().min(LENS_PROMPT_MIN).max(LENS_PROMPT_MAX).optional(),
})

// 统一错误响应
function errorResponse(message: string, status: number): NextResponse {
  console.error('[Lens API]', { message, status })
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    const parsed = UpdateLensSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('参数验证失败', 400)
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('custom_lenses')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)  // 代码层双重验证
      .select('id, name, icon, description, system_prompt, created_at, updated_at')
      .single()

    if (error) {
      return errorResponse('更新失败，请重试', 500)
    }

    if (!data) {
      return errorResponse('透镜不存在或无权访问', 404)
    }

    return successResponse(data)

  } catch (error) {
    console.error('[Lens PATCH] Unexpected error:', error)
    return errorResponse('服务器内部错误', 500)
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse('未登录', 401)
    }

    const supabase = await createClient()

    // 软删除：is_active = false
    const { error } = await supabase
      .from('custom_lenses')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', user.id)  // 代码层双重验证

    if (error) {
      return errorResponse('删除失败，请重试', 500)
    }

    return new Response(null, { status: 204 })

  } catch (error) {
    console.error('[Lens DELETE] Unexpected error:', error)
    return errorResponse('服务器内部错误', 500)
  }
}
