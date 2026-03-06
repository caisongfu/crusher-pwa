import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { HTTP_STATUS } from '@/lib/constants';
import { sendRefundNotification } from '@/lib/email/resend';

// 请求参数验证
const ApproveRefundSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: HTTP_STATUS.UNAUTHORIZED.message },
        { status: HTTP_STATUS.UNAUTHORIZED.status }
      );
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: HTTP_STATUS.FORBIDDEN.message },
        { status: HTTP_STATUS.FORBIDDEN.status }
      );
    }

    // 解析和验证请求参数
    const body = await req.json();
    const validatedData = ApproveRefundSchema.parse(body);

    // 验证拒绝原因
    if (validatedData.action === 'reject' && !validatedData.rejectionReason) {
      return NextResponse.json(
        { error: '拒绝时必须填写拒绝原因' },
        { status: HTTP_STATUS.BAD_REQUEST.status }
      );
    }

    // 获取路由参数
    const { id } = await params;

    // 查询退款请求
    const { data: refundRequest, error: queryError } = await supabase
      .from('refund_requests')
      .select(`
        *,
        user:profiles!user_id(id, email, username)
      `)
      .eq('id', id)
      .eq('status', 'pending')
      .single();

    if (queryError || !refundRequest) {
      return NextResponse.json(
        { error: '退款请求不存在或已处理' },
        { status: HTTP_STATUS.NOT_FOUND.status }
      );
    }

    // 验证审批人不是发起人
    if (refundRequest.requested_by === user.id) {
      return NextResponse.json(
        { error: '不能审批自己发起的退款请求' },
        { status: HTTP_STATUS.BAD_REQUEST.status }
      );
    }

    // 查询订单信息
    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('id', refundRequest.order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: '订单不存在' },
        { status: HTTP_STATUS.NOT_FOUND.status }
      );
    }

    // 如果批准退款
    if (validatedData.action === 'approve') {
      // 获取用户当前积分
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', refundRequest.user_id)
        .single();

      if (!currentProfile) {
        return NextResponse.json(
          { error: '用户不存在' },
          { status: HTTP_STATUS.NOT_FOUND.status }
        );
      }

      const newBalance = currentProfile.credits + refundRequest.refund_amount;

      // 更新用户积分
      const { error: updateCreditsError } = await supabase
        .from('profiles')
        .update({ credits: newBalance, updated_at: new Date().toISOString() })
        .eq('id', refundRequest.user_id);

      if (updateCreditsError) {
        console.error('更新用户积分失败:', updateCreditsError);
        return NextResponse.json(
          { error: '更新积分失败' },
          { status: 500 }
        );
      }

      // 记录到积分流水（type: refund）
      await supabase.from('credit_transactions').insert({
        user_id: refundRequest.user_id,
        amount: refundRequest.refund_amount,
        balance_after: newBalance,
        type: 'refund',
        description: `退款：${refundRequest.reason}`,
        operated_by: user.id,
        related_order_id: refundRequest.order_id,
      });

      // 更新订单状态为已退款
      await supabase
        .from('payment_orders')
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', refundRequest.order_id);
    }

    // 更新退款请求状态
    const { error: updateError } = await supabase
      .from('refund_requests')
      .update({
        status: validatedData.action === 'approve' ? 'approved' : 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: validatedData.rejectionReason || null,
      })
      .eq('id', id);

    if (updateError) {
      console.error('更新退款请求状态失败:', updateError);
      return NextResponse.json(
        { error: '更新状态失败' },
        { status: 500 }
      );
    }

    // 发送邮件通知用户
    if (refundRequest.user?.email) {
      const isApproved = validatedData.action === 'approve';
      await sendRefundNotification(
        refundRequest.user.email,
        order.id,
        order.package_name,
        refundRequest.refund_amount,
        isApproved,
        validatedData.rejectionReason
      );
    }

    return NextResponse.json({
      success: true,
      message: validatedData.action === 'approve'
        ? '退款已批准，积分已回退'
        : '退款已拒绝',
    });
  } catch (error) {
    console.error('退款审批 API 错误:', error);
    return NextResponse.json(
      { error: HTTP_STATUS.INTERNAL_ERROR.message },
      { status: HTTP_STATUS.INTERNAL_ERROR.status }
    );
  }
}
