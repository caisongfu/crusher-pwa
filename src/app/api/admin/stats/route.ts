import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { statsCache } from '@/lib/cache/redis';

// 请求参数验证
const StatsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// 缓存 TTL: 10 分钟（600 秒）
const CACHE_TTL = 600;

export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: profile } = await (supabase as any)
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
      // 使用缓存获取今日统计
      const cacheKey = `today`;
      const todayStats = await statsCache.cached(
        cacheKey,
        async () => {
          const { data, error: statsError } = await (supabase as any)
            .rpc('get_today_stats');

          if (statsError) {
            console.error('获取今日统计失败:', statsError);
            throw new Error('获取统计失败');
          }

          return data;
        },
        CACHE_TTL
      );

      // 格式化返回数据
      return NextResponse.json({
        date: new Date().toISOString().split('T')[0],
        ...todayStats,
      });
    }

    // 如果指定了日期范围，从 daily_stats 表查询
    const startDate = params.startDate || new Date().toISOString().split('T')[0];
    const endDate = params.endDate || new Date().toISOString().split('T')[0];

    // 使用缓存获取日期范围统计
    const cacheKey = `range:${startDate}:${endDate}`;
    const stats = await statsCache.cached(
      cacheKey,
      async () => {
        const { data, error } = await (supabase as any)
          .from('daily_stats')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });

        if (error) {
          console.error('查询统计数据失败:', error);
          throw new Error('查询失败');
        }

        return data || [];
      },
      CACHE_TTL
    );

    return NextResponse.json({
      stats,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error('用量统计 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
