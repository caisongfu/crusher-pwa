import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 请求参数验证
const StatsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 解析和验证请求参数
    const { searchParams } = new URL(req.url);
    const params = StatsQuerySchema.parse(Object.fromEntries(searchParams));

    // 如果没有指定日期范围，返回今日统计
    if (!params.startDate && !params.endDate) {
      // 使用数据库函数获取今日统计
      const { data: todayStats, error: statsError } = await supabase
        .rpc('get_today_stats');

      if (statsError) {
        console.error('获取今日统计失败:', statsError);
        return NextResponse.json({ error: '获取统计失败' }, { status: 500 });
      }

      // 格式化返回数据
      return NextResponse.json({
        date: new Date().toISOString().split('T')[0],
        ...todayStats,
      });
    }

    // 如果指定了日期范围，从 daily_stats 表查询
    const startDate = params.startDate || new Date().toISOString().split('T')[0];
    const endDate = params.endDate || new Date().toISOString().split('T')[0];

    const { data: stats, error } = await supabase
      .from('daily_stats')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('查询统计数据失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({
      stats: stats || [],
      startDate,
      endDate,
    });
  } catch (error) {
    console.error('用量统计 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
