import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { ZodError } from 'zod'

// 获取反馈列表
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    let query = supabase
      .from('feedbacks')
      .select(`*, profiles:user_id (username, email)`)
      .order('created_at', { ascending: false })

    if (type && ['payment', 'bug', 'feature', 'other'].includes(type)) {
      query = query.eq('type', type)
    }

    if (status && ['pending', 'processing', 'resolved', 'closed'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data: feedbacks, error } = await query

    if (error) {
      console.error('查询反馈列表失败:', error)
      return NextResponse.json({ 
        error: '查询失败',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 })
    }

    return NextResponse.json({ feedbacks: feedbacks || [] })
  } catch (error) {
    console.error('反馈列表 API 错误:', error)
    return NextResponse.json({ 
      error: '服务器错误',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}

const UpdateFeedbackSchema = z.object({
  status: z.enum(['pending', 'processing', 'resolved', 'closed']),
  adminNote: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

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

    const { data: feedback, error } = await supabase
      .from('feedbacks')
      .update({
        status: validatedData.status,
        admin_note: validatedData.adminNote || null,
        handled_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

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