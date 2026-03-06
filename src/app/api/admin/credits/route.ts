import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 请求参数验证
const CreateCreditOperationSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number(),
  type: z.enum(['manual_grant', 'admin_deduct']),
  description: z.string().min(1, '备注不能为空'),
});

export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const validatedData = CreateCreditOperationSchema.parse(body);

    // 检查用户是否存在
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', validatedData.userId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 创建待审批积分操作
    const { data: pendingTransaction, error } = await supabase
      .from('pending_credit_transactions')
      .insert({
        user_id: validatedData.userId,
        amount: validatedData.amount,
        type: validatedData.type,
        description: validatedData.description,
        requested_by: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !pendingTransaction) {
      console.error('创建积分操作失败:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      pendingTransactionId: pendingTransaction.id,
      message: '积分操作已提交，等待其他管理员审批',
    });
  } catch (error) {
    console.error('积分操作 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
