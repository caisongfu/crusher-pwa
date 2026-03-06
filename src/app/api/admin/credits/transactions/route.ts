import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createServerClient } from '@/lib/supabase/server';

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

    // 获取用户 ID
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: '用户 ID 缺失' }, { status: 400 });
    }

    // 查询积分流水
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('查询积分流水失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({
      transactions: data || [],
    });
  } catch (error) {
    console.error('积分流水 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
