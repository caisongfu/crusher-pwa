import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { ZodError } from 'zod'

// 获取单个反馈详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as any

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const { data: feedback, error } = await (supabase as any)
      .from('feedbacks')
      .select(`*, profiles:user_id (username, email)`)
      .eq('id', id)
      .single() as any

    if (error || !feedback) {
      console.error('查询反馈失败:', error)
      return NextResponse.json({
        error: '查询失败',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      }, { status: 404 })
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('反馈详情 API 错误:', error)
    return NextResponse.json({
      error: '服务器错误',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}

const UpdateFeedbackSchema = z.object({
  status: z.enum(['pending', 'processing', 'resolved', 'closed']).optional(),
  adminNote: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as any

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    let validatedData
    try {
      validatedData = UpdateFeedbackSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        return NextResponse.json({
          error: '参数验证失败',
          details: process.env.NODE_ENV === 'development' ? validationError.errors : undefined
        }, { status: 400 })
      }
      throw validationError
    }

    const { id } = await params

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status
    }
    if (validatedData.adminNote !== undefined) {
      updateData.admin_note = validatedData.adminNote
    }

    const { data: feedback, error } = await (supabase as any)
      .from('feedbacks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single() as any

    if (error || !feedback) {
      console.error('更新反馈失败:', error)
      return NextResponse.json({
        error: '更新失败',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      feedback,
      message: '反馈状态已更新',
    })
  } catch (error) {
    console.error('更新反馈 API 错误:', error)
    return NextResponse.json({
      error: '服务器错误',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as any

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const { error } = await (supabase as any)
      .from('feedbacks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('删除反馈失败:', error)
      return NextResponse.json({
        error: '删除失败',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '反馈已删除',
    })
  } catch (error) {
    console.error('删除反馈 API 错误:', error)
    return NextResponse.json({
      error: '服务器错误',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}
