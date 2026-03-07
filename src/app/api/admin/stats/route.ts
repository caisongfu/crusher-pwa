import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const StatsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// 生成日期范围内所有天（YYYY-MM-DD 数组）
function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (current <= last) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export async function GET(req: NextRequest) {
  try {
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

    const { searchParams } = new URL(req.url);
    const params = StatsQuerySchema.parse(Object.fromEntries(searchParams));

    const today = new Date().toISOString().split('T')[0];
    const startDate = params.startDate || today;
    const endDate = params.endDate || today;

    const allDates = getDatesInRange(startDate, endDate);

    // 并行触发每天的统计更新（upsert 到 daily_stats）
    await Promise.all(
      allDates.map((date) =>
        (supabase as any).rpc('update_daily_stats', { p_date: date })
      )
    );

    // 从 daily_stats 读取最新数据
    const { data, error } = await (supabase as any)
      .from('daily_stats')
      .select('date, new_users, orders_count, total_revenue_fen, total_credits_consumed, active_users, total_input_tokens, total_output_tokens')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('查询 daily_stats 失败:', error);
      throw new Error('查询失败');
    }

    // 映射为前端期望的字段名，确保每一天都有数据（无记录则补零）
    const rowMap = new Map((data || []).map((r: any) => [r.date, r]));
    const stats = allDates.map((date) => {
      const row: any = rowMap.get(date) ?? {};
      return {
        date,
        new_users: row.new_users ?? 0,
        orders: row.orders_count ?? 0,
        revenue: row.total_revenue_fen ?? 0,
        credits_consumed: row.total_credits_consumed ?? 0,
        active_users: row.active_users ?? 0,
        total_input_tokens: row.total_input_tokens ?? 0,
        total_output_tokens: row.total_output_tokens ?? 0,
      };
    });

    return NextResponse.json({ stats, startDate, endDate });
  } catch (error) {
    console.error('用量统计 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
