import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 请求参数验证
const CreateRefundRequestSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(1, '退款原因不能为空'),
  refundAmount: z.number().positive().optional(),
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
    const validatedData = CreateRefundRequestSchema.parse(body);

    // 查询订单信息
    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('id', validatedData.orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 检查订单状态（只能退款已支付的订单）
    if (order.status !== 'paid') {
      return NextResponse.json(
        { error: '只能退款已支付的订单' },
        { status: 400 }
      );
    }

    // 检查是否有正在处理的退款请求
    const { data: existingRequest } = await supabase
      .from('refund_requests')
      .select('*')
      .eq('order_id', validatedData.orderId)
      .in('status', ['pending', 'approved'])
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: '该订单已有正在处理的退款请求' },
        { status: 400 }
      );
    }

    // 计算退款金额（默认全额退款）
    const refundAmount = validatedData.refundAmount || order.credits_granted;

    // 检查退款金额是否合理
    if (refundAmount > order.credits_granted) {
      return NextResponse.json(
        { error: '退款金额不能超过已赠送的积分' },
        { status: 400 }
      );
    }

    // 创建退款请求
    const { data: refundRequest, error } = await supabase
      .from('refund_requests')
      .insert({
        order_id: validatedData.orderId,
        user_id: order.user_id,
        reason: validatedData.reason,
        refund_amount: refundAmount,
        requested_by: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !refundRequest) {
      console.error('创建退款请求失败:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      refundRequestId: refundRequest.id,
      message: '退款请求已创建，等待第二管理员审批',
    });
  } catch (error) {
    console.error('退款请求 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// GET: 获取退款请求列表
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

    // 获取查询参数
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    // 构建查询
    let query = supabase
      .from('refund_requests')
      .select(`
        *,
        order:payment_orders(id, out_trade_no, package_name, amount_fen, credits_granted),
        requested_by_profile:profiles!requested_by(id, email, username),
        user_profile:profiles!user_id(id, email, username)
      `)
      .order('created_at', { ascending: false });

    // 筛选状态
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('查询退款请求失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({
      requests: data || [],
    });
  } catch (error) {
    console.error('退款请求列表 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
