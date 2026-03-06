import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

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

    // 查询待审批列表（不包括自己发起的）
    const { data: transactions, error } = await (supabase as any)
      .from('pending_credit_transactions')
      .select(`
        *,
        requested_by_profile:profiles!requested_by(id, email, username),
        user_profile:profiles!user_id(id, email, username)
      `)
      .eq('status', 'pending')
      .neq('requested_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('查询待审批列表失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 格式化返回数据
    const formattedTransactions = (transactions || []).map((tx: any) => ({
      id: tx.id,
      user_id: tx.user_id,
      user_email: tx.user_profile?.email,
      user_username: tx.user_profile?.username,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      requested_by: tx.requested_by,
      requested_by_email: tx.requested_by_profile?.email,
      requested_by_username: tx.requested_by_profile?.username,
      created_at: tx.created_at,
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
    });
  } catch (error) {
    console.error('待审批列表 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
