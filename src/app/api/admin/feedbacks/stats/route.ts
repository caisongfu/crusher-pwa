import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase/server'

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

    // 获取今日反馈数量
    const today = new Date().toISOString().split('T')[0]
    const { data: todayFeedbacks, error: todayError } = await supabase
      .from('feedbacks')
      .select('*')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)

    if (todayError) {
      console.error('查询今日反馈失败:', todayError)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    // 按状态统计
    const { data: statsByStatus, error: statusError } = await supabase
      .from('feedbacks')
      .select('status')
      .order('status')

    if (statusError) {
      console.error('按状态统计失败:', statusError)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    // 按类型统计
    const { data: statsByType, error: typeError } = await supabase
      .from('feedbacks')
      .select('type')
      .order('type')

    if (typeError) {
      console.error('按类型统计失败:', typeError)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    // 计算状态分布
    const statusCountMap = new Map()
    statsByStatus?.forEach((item) => {
      const count = statusCountMap.get(item.status) || 0
      statusCountMap.set(item.status, count + 1)
    })

    // 计算类型分布
    const typeCountMap = new Map()
    statsByType?.forEach((item) => {
      const count = typeCountMap.get(item.type) || 0
      typeCountMap.set(item.type, count + 1)
    })

    return NextResponse.json({
      todayCount: todayFeedbacks?.length || 0,
      statsByStatus: Array.from(statusCountMap.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      statsByType: Array.from(typeCountMap.entries()).map(([type, count]) => ({
        type,
        count,
      })),
    })
  } catch (error) {
    console.error('反馈统计 API 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}