import { NextResponse } from 'next/server';
import { getCurrentUser, createClient } from '@/lib/supabase/server';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  // 并行查询所有需要的数据
  const [profileRes, docCountRes, insightsRes] = await Promise.all([
    // 当前积分
    supabase.from('profiles').select('credits').eq('id', user.id).single(),
    // 文档总数
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_deleted', false),
    // 所有 insights（用于多维聚合）
    supabase
      .from('insights')
      .select('lens_type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const credits = profileRes.data?.credits ?? 0;
  const documentCount = docCountRes.count ?? 0;
  const allInsights = insightsRes.data ?? [];
  const analysisCount = allInsights.length;

  // 最常用透镜
  const lensCountMap: Record<string, number> = {};
  for (const ins of allInsights) {
    lensCountMap[ins.lens_type] = (lensCountMap[ins.lens_type] ?? 0) + 1;
  }
  const topLens = Object.entries(lensCountMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // 近 7 天趋势（按日期 COUNT）
  const now = new Date();
  const last7Days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const count = allInsights.filter((ins) => ins.created_at.startsWith(dateStr)).length;
    last7Days.push({ date: dateStr, count });
  }

  // 透镜使用分布（饼图数据）
  const lensDistribution = Object.entries(lensCountMap).map(([lens, count]) => ({
    lens,
    count,
  }));

  return NextResponse.json({
    credits,
    documentCount,
    analysisCount,
    topLens,
    last7Days,
    lensDistribution,
  });
}
