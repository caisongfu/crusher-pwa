import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 更新用户状态验证
const UpdateUserSchema = z.object({
  disable_type: z.enum(['normal', 'login_disabled', 'usage_disabled']),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 获取路由参数
    const { id } = await params;

    // 查询用户详情
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('查询用户详情失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const validatedData = UpdateUserSchema.parse(body);

    // 获取路由参数
    const { id } = await params;

    // 更新用户状态（使用 service_role 客户端绕过 RLS）
    const adminSupabase = createAdminClient();
    const { data: updatedUser, error } = await adminSupabase
      .from('profiles')
      .update({
        disable_type: validatedData.disable_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedUser) {
      console.error('更新用户状态失败:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('更新用户状态 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
