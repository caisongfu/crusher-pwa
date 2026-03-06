import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 请求参数验证
const ApproveCreditOperationSchema = z.object({
  transactionId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
});

export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const validatedData = ApproveCreditOperationSchema.parse(body);

    // 验证拒绝原因
    if (validatedData.action === 'reject' && !validatedData.rejectionReason) {
      return NextResponse.json(
        { error: '拒绝时必须填写拒绝原因' },
        { status: 400 }
      );
    }

    // 查询待审批操作
    const { data: pendingTransaction, error: queryError } = await (supabase as any)
      .from('pending_credit_transactions')
      .select('*')
      .eq('id', validatedData.transactionId)
      .eq('status', 'pending')
      .single();

    if (queryError || !pendingTransaction) {
      return NextResponse.json({ error: '待审批操作不存在或已处理' }, { status: 404 });
    }

    // 验证审批人不是发起人
    if (pendingTransaction.requested_by === user.id) {
      return NextResponse.json(
        { error: '不能审批自己发起的操作' },
        { status: 400 }
      );
    }

    // 开始事务
    if (validatedData.action === 'approve') {
      // 获取当前积分余额
      const { data: currentProfile } = await (supabase as any)
        .from('profiles')
        .select('credits')
        .eq('id', pendingTransaction.user_id)
        .single();

      if (!currentProfile) {
        return NextResponse.json({ error: '用户不存在' }, { status: 404 });
      }

      // 检查余额是否足够（扣减时）
      if (pendingTransaction.amount < 0) {
        if (currentProfile.credits + pendingTransaction.amount < 0) {
          return NextResponse.json({ error: '积分余额不足' }, { status: 400 });
        }
      }

      const newBalance = currentProfile.credits + pendingTransaction.amount;

      // 更新用户积分
      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update({ credits: newBalance, updated_at: new Date().toISOString() })
        .eq('id', pendingTransaction.user_id);

      if (updateError) {
        console.error('更新用户积分失败:', updateError);
        return NextResponse.json({ error: '更新积分失败' }, { status: 500 });
      }

      // 记录到积分流水
      await (supabase as any).from('credit_transactions').insert({
        user_id: pendingTransaction.user_id,
        amount: pendingTransaction.amount,
        balance_after: newBalance,
        type: pendingTransaction.type,
        description: pendingTransaction.description,
        operated_by: user.id,
      });

      // 发送邮件通知用户
      await sendCreditNotification(
        pendingTransaction.user_id,
        pendingTransaction.amount,
        newBalance,
        pendingTransaction.description
      );
    }

    // 更新待审批操作状态
    const { error: updateError } = await (supabase as any)
      .from('pending_credit_transactions')
      .update({
        status: validatedData.action === 'approve' ? 'approved' : 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: validatedData.rejectionReason || null,
      })
      .eq('id', validatedData.transactionId);

    if (updateError) {
      console.error('更新审批状态失败:', updateError);
      return NextResponse.json({ error: '更新审批状态失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: validatedData.action === 'approve'
        ? '审批通过，积分已生效'
        : '审批已拒绝',
    });
  } catch (error) {
    console.error('积分审批 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 发送积分变更通知邮件
async function sendCreditNotification(
  userId: string,
  amount: number,
  newBalance: number,
  description: string
) {
  try {
    const supabase = await createClient();
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (!profile) {
      console.error('用户不存在，无法发送邮件');
      return;
    }

    // 调用 Supabase Auth 发送邮件
    // 注意：Supabase Auth 不支持自定义邮件模板
    // 这里需要使用 Supabase Edge Function 或第三方邮件服务
    console.log(`发送积分通知邮件到 ${profile.email}`, {
      amount,
      newBalance,
      description,
    });

    // TODO: 实现邮件发送
    // 可以使用 Resend、SendGrid 或 Supabase Edge Function
  } catch (error) {
    console.error('发送邮件失败:', error);
  }
}
