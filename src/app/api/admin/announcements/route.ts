import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

// 获取公告列表
export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
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

    // 查询公告列表
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('查询公告列表失败:', error)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    return NextResponse.json({ announcements: announcements || [] })
  } catch (error) {
    console.error('公告列表 API 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 创建新公告
const CreateAnnouncementSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().min(1, '内容不能为空'),
  type: z.enum(['info', 'warning', 'maintenance']),
  expiresAt: z.string().optional(),
  isActive: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  try {
    // 验证管理员权限
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

    // 解析和验证请求参数
    const body = await req.json()
    const validatedData = CreateAnnouncementSchema.parse(body)

    // 创建公告
    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        title: validatedData.title,
        content: validatedData.content,
        type: validatedData.type,
        expires_at: validatedData.expiresAt ? new Date(validatedData.expiresAt).toISOString() : null,
        is_active: validatedData.isActive,
        created_by: user.id,
      })
      .select()
      .single()

    if (error || !announcement) {
      console.error('创建公告失败:', error)
      return NextResponse.json({ error: '创建失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      announcement,
      message: '公告创建成功',
    })
  } catch (error) {
    console.error('创建公告 API 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
