import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// 获取活跃公告（公开端点，无需认证）
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient()

    // 查询活跃的公告
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('查询公告失败:', error)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    // 过滤掉已过期的公告
    const now = new Date()
    const validAnnouncements = (announcements || []).filter(a => {
      if (!a.expires_at) return true
      return new Date(a.expires_at) > now
    })

    return NextResponse.json({ announcements: validAnnouncements })
  } catch (error) {
    console.error('公告列表 API 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
