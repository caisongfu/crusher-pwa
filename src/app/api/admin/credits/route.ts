import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const Schema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().refine((n) => n !== 0, '金额不能为 0'),
  type: z.enum(['manual_grant', 'admin_deduct']),
  description: z.string().min(1, '备注不能为空').max(200),
});

export async function POST(req: NextRequest) {
  try {
    // 1. 验证管理员身份
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    const { data: adminProfile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. 校验请求参数
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { userId, amount, type, description } = parsed.data;

    // 3. 读取目标用户当前余额
    const { data: targetProfile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('id, credits')
      .eq('id', userId)
      .single();

    if (profileError || !targetProfile) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 4. 计算新余额
    const newBalance = targetProfile.credits + amount;
    if (newBalance < 0) {
      return NextResponse.json(
        { error: `积分不足，当前余额 ${targetProfile.credits}，无法扣减 ${Math.abs(amount)}` },
        { status: 400 }
      );
    }

    // 5. 更新 profiles.credits
    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update({ credits: newBalance })
      .eq('id', userId);

    if (updateError) {
      console.error('更新积分失败:', updateError);
      return NextResponse.json({ error: '更新积分失败' }, { status: 500 });
    }

    // 6. 写入积分流水记录
    const { error: txError } = await adminSupabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount,
        balance_after: newBalance,
        type,
        description,
        operated_by: user.id,
      });

    if (txError) {
      console.error('写入积分记录失败:', txError);
      // 不回滚（简化实现），但记录错误
    }

    return NextResponse.json({ success: true, newBalance });
  } catch (error) {
    console.error('积分调整 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
