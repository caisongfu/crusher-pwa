import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { ZodError } from 'zod'

// 获取反馈列表
export async function GET(req: NextRequest) {
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