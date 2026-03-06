import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, isAdminAuthError } from '@/lib/admin/auth';
import { PAGINATION, ORDER_STATUS } from '@/lib/constants';

// 请求参数验证
const ListOrdersSchema = z.object({
  page: z.coerce.number().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  status: z.enum([ORDER_STATUS.PENDING, ORDER_STATUS.PAID, ORDER_STATUS.FAILED, ORDER_STATUS.REFUNDED]).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const auth = await requireAdmin();
    if (isAdminAuthError(auth)) return auth;

    const supabase = await (await import('@/lib/supabase/server')).createServerClient();

    // 解析和验证请求参数
    const { searchParams } = new URL(req.url);
    const params = ListOrdersSchema.parse(Object.fromEntries(searchParams));

    // 构建查询
    let query = supabase
      .from('payment_orders')
      .select(`
        *,
        profiles:user_id(id, email, username)
      `, { count: 'exact' });

    // 筛选状态
    if (params.status) {
      query = query.eq('status', params.status);
    }

    // 筛选日期范围
    if (params.startDate) {
      query = query.gte('created_at', new Date(params.startDate).toISOString());
    }
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }

    // 搜索订单号或用户邮箱
    if (params.search) {
      query = query.or(`out_trade_no.ilike.%${params.search}%,profiles.email.ilike.%${params.search}%`);
    }

    // 分页
    const from = (params.page - 1) * params.limit;
    const to = from + params.limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    // 执行查询
    const { data, error, count } = await query;

    if (error) {
      console.error('查询订单列表失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 格式化响应数据
    const orders = (data || []).map((order) => ({
      id: order.id,
      user_id: order.user_id,
      out_trade_no: order.out_trade_no,
      platform_order: order.platform_order,
      package_name: order.package_name,
      amount_fen: order.amount_fen,
      credits_granted: order.credits_granted,
      status: order.status,
      payment_method: order.payment_method,
      paid_at: order.paid_at,
      created_at: order.created_at,
      user: order.profiles,
    }));

    return NextResponse.json({
      orders,
      total: count || 0,
      page: params.page,
      limit: params.limit,
    });
  } catch (error) {
    console.error('订单列表 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
