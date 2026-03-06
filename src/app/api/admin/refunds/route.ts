import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  PAGINATION,
  REFUND_STATUS,
  HTTP_STATUS,
  type RefundStatus,
} from '@/lib/constants';

// 请求参数验证
const CreateRefundRequestSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(1, '退款原因不能为空'),
  refundAmount: z.number().positive().optional(),
});

// 列表查询参数验证
const ListRefundsSchema = z.object({
  page: z.coerce.number().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  status: z
    .enum([
      REFUND_STATUS.PENDING,
      REFUND_STATUS.APPROVED,
      REFUND_STATUS.REJECTED,
    ])
    .optional(),
});

export async function POST(req: NextRequest) {
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
    const { data: profile } = await (supabase as any)
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
    const validatedData = CreateRefundRequestSchema.parse(body);

    // 查询订单信息
    const { data: order, error: orderError } = await (supabase as any)
      .from('payment_orders')
      .select('*')
      .eq('id', validatedData.orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: '订单不存在' },
        { status: HTTP_STATUS.NOT_FOUND.status }
      );
    }

    // 检查订单状态（只能退款已支付的订单）
    if (order.status !== 'paid') {
      return NextResponse.json(
        { error: '只能退款已支付的订单' },
        { status: HTTP_STATUS.BAD_REQUEST.status }
      );
    }

    // 检查是否有正在处理的退款请求
    const { data: existingRequest } = await (supabase as any)
      .from('refund_requests')
      .select('*')
      .eq('order_id', validatedData.orderId)
      .in('status', ['pending', 'approved'])
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: '该订单已有正在处理的退款请求' },
        { status: HTTP_STATUS.BAD_REQUEST.status }
      );
    }

    // 计算退款金额（默认全额退款）
    const refundAmount = validatedData.refundAmount || order.credits_granted;

    // 检查退款金额是否合理
    if (refundAmount > order.credits_granted) {
      return NextResponse.json(
        { error: '退款金额不能超过已赠送的积分' },
        { status: HTTP_STATUS.BAD_REQUEST.status }
      );
    }

    // 创建退款请求
    const { data: refundRequest, error } = await (supabase as any)
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
      return NextResponse.json(
        { error: '创建失败' },
        { status: HTTP_STATUS.INTERNAL_ERROR.status }
      );
    }

    return NextResponse.json({
      success: true,
      refundRequestId: refundRequest.id,
      message: '退款请求已创建，等待第二管理员审批',
    });
  } catch (error) {
    console.error('退款请求 API 错误:', error);
    return NextResponse.json(
      { error: HTTP_STATUS.INTERNAL_ERROR.message },
      { status: HTTP_STATUS.INTERNAL_ERROR.status }
    );
  }
}

// GET: 获取退款请求列表（支持分页）
export async function GET(req: NextRequest) {
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
    const { data: profile } = await (supabase as any)
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

    // 获取并验证查询参数
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams.entries());

    // 验证查询参数
    const validatedParams = ListRefundsSchema.parse(params);

    // 计算偏移量
    const offset = (validatedParams.page - 1) * validatedParams.limit;

    // 构建查询
    let query = supabase
      .from('refund_requests')
      .select(`
        id,
        order_id,
        user_id,
        reason,
        refund_amount,
        requested_by,
        status,
        approved_by,
        approved_at,
        rejection_reason,
        created_at,
        order:payment_orders(id, out_trade_no, package_name, amount_fen, credits_granted),
        requested_by_profile:profiles!requested_by(id, email, username),
        user_profile:profiles!user_id(id, email, username)
      `)
      .order('created_at', { ascending: false });

    // 筛选状态
    if (validatedParams.status) {
      query = query.eq('status', validatedParams.status);
    }

    // 获取总数
    const { count, error: countError } = await (query as any).select("*").count("exact", { head: true });

    if (countError) {
      console.error('查询退款请求总数失败:', countError);
      return NextResponse.json(
        { error: '查询失败' },
        { status: 500 }
      );
    }

    // 查询分页数据
    const { data, error } = await query
      .range(offset, offset + validatedParams.limit - 1);

    if (error) {
      console.error('查询退款请求失败:', error);
      return NextResponse.json(
        { error: '查询失败' },
        { status: 500 }
      );
    }

    // 计算总页数
    const totalPages = Math.ceil((count || 0) / validatedParams.limit);

    return NextResponse.json({
      requests: data || [],
      pagination: {
        total: count || 0,
        page: validatedParams.page,
        limit: validatedParams.limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error('退款请求列表 API 错误:', error);
    return NextResponse.json(
      { error: HTTP_STATUS.INTERNAL_ERROR.message },
      { status: HTTP_STATUS.INTERNAL_ERROR.status }
    );
  }
}
