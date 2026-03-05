// @ts-nocheck - Supabase 类型推断问题
// src/app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, getCurrentUser } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  const { id } = await params

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: '文档不存在或无权访问' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, data })
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  const { id } = await params

  const supabase = await createClient()

  // 先验证文档归属
  const { data: existing } = await supabase
    .from('documents')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .single()

  if (!existing) {
    return NextResponse.json(
      { success: false, error: '文档不存在或无权操作' },
      { status: 404 }
    )
  }

  // @ts-ignore - Supabase 类型推断问题，实际运行正常
  const { error } = await supabase
    .from('documents')
    .update({ is_deleted: true })
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { success: false, error: '删除失败，请重试' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}