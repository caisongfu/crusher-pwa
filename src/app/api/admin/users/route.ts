import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 请求参数验证
const ListUsersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['normal', 'login_disabled', 'usage_disabled']).optional(),
  creditsMin: z.coerce.number().optional(),
  creditsMax: z.coerce.number().optional(),
});

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

    // 解析和验证请求参数
    const { searchParams } = new URL(req.url);
    const params = ListUsersSchema.parse(Object.fromEntries(searchParams));

    // 构建查询
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    // 搜索（支持 email 和 username）
    if (params.search) {
      query = query.or(`username.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }

    // 筛选状态
    if (params.status) {
      query = query.eq('disable_type', params.status);
    }

    // 筛选积分范围
    if (params.creditsMin !== undefined) {
      query = query.gte('credits', params.creditsMin);
    }
    if (params.creditsMax !== undefined) {
      query = query.lte('credits', params.creditsMax);
    }

    // 分页
    const from = (params.page - 1) * params.limit;
    const to = from + params.limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    // 执行查询
    const { data, error, count } = await query;

    if (error) {
      console.error('查询用户列表失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({
      users: data || [],
      total: count || 0,
      page: params.page,
      limit: params.limit,
    });
  } catch (error) {
    console.error('用户列表 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
