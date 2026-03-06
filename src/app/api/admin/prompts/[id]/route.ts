import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

// 激活 Prompt 版本
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

    // 获取路由参数
    const { id } = await params

    // 查询要激活的版本
    const { data: targetVersion, error: queryError } = await (supabase as any)
      .from('system_prompts')
      .select('*')
      .eq('id', id)
      .single() as any

    if (queryError || !targetVersion) {
      return NextResponse.json({ error: '版本不存在' }, { status: 404 })
    }

    // 取消该透镜类型的所有其他版本的激活状态
    await (supabase as any)
      .from('system_prompts')
      .update({ is_active: false })
      .eq('lens_type', targetVersion.lens_type)

    // 激活目标版本
    const { data: updatedVersion, error: updateError } = await (supabase as any)
      .from('system_prompts')
      .update({ is_active: true })
      .eq('id', id)
      .select()
      .single() as any

    if (updateError || !updatedVersion) {
      console.error('激活 Prompt 版本失败:', updateError)
      return NextResponse.json({ error: '激活失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '版本已激活',
      activeVersion: updatedVersion,
    })
  } catch (error) {
    console.error('激活 Prompt API 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 删除 Prompt 版本
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

    // 查询要删除的版本
    const { data: targetVersion, error: queryError } = await (supabase as any)
      .from('system_prompts')
      .select('*')
      .eq('id', id)
      .single() as any

    if (queryError || !targetVersion) {
      return NextResponse.json({ error: '版本不存在' }, { status: 404 })
    }

    // 不能删除激活的版本
    if (targetVersion.is_active) {
      return NextResponse.json(
        { error: '不能删除激活的版本，请先激活其他版本' },
        { status: 400 }
      )
    }

    // 删除版本
    const { error: deleteError } = await (supabase as any)
      .from('system_prompts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('删除 Prompt 版本失败:', deleteError)
      return NextResponse.json({ error: '删除失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '版本已删除',
    })
  } catch (error) {
    console.error('删除 Prompt API 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
