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

    // 3. 验证目标用户存在
    const { data: targetProfile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('id, credits')
      .eq('id', userId)
      .single();

    if (profileError || !targetProfile) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 4. 扣减时做预检（避免提交明显无法生效的请求）
    if (amount < 0 && targetProfile.credits + amount < 0) {
      return NextResponse.json(
        { error: `积分不足，当前余额 ${targetProfile.credits}，无法扣减 ${Math.abs(amount)}` },
        { status: 400 }
      );
    }

    // 5. 写入待审批表（不更新 profiles.credits，不写 credit_transactions）
    const { data: pendingTx, error: pendingError } = await (adminSupabase as any)
      .from('pending_credit_transactions')
      .insert({
        user_id: userId,
        amount,
        type,
        description,
        requested_by: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (pendingError) {
      console.error('写入待审批记录失败:', pendingError);
      return NextResponse.json({ error: '提交失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, pendingId: pendingTx.id });
  } catch (error) {
    console.error('积分调整 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
