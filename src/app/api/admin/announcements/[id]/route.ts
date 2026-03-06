import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// 更新公告
const UpdateAnnouncementSchema = z.object({
  title: z.string().min(1, '标题不能为空').optional(),
  content: z.string().min(1, '内容不能为空').optional(),
  type: z.enum(['info', 'warning', 'maintenance']).optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
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

    // 解析和验证请求参数
    const body = await req.json()
    const validatedData = UpdateAnnouncementSchema.parse(body)

    // 获取路由参数
    const { id } = await params

    // 构建更新数据
    const updateData: any = {}
    if (validatedData.title !== undefined) updateData.title = validatedData.title
    if (validatedData.content !== undefined) updateData.content = validatedData.content
    if (validatedData.type !== undefined) updateData.type = validatedData.type
    if (validatedData.expiresAt !== undefined) {
      updateData.expires_at = validatedData.expiresAt ? new Date(validatedData.expiresAt).toISOString() : null
    }
    if (validatedData.isActive !== undefined) updateData.is_active = validatedData.isActive

    // 更新公告
    const { data: announcement, error } = await (supabase as any)
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single() as any

    if (error || !announcement) {
      console.error('更新公告失败:', error)
      return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      announcement,
      message: '公告更新成功',
    })
  } catch (error) {
    console.error('更新公告 API 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 删除公告
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
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

    // 获取路由参数
    const { id } = await params

    // 删除公告
    const { error } = await (supabase as any)
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('删除公告失败:', error)
      return NextResponse.json({ error: '删除失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '公告删除成功',
    })
  } catch (error) {
    console.error('删除公告 API 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
