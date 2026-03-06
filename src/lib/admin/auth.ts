import { getCurrentUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * 验证用户是否为管理员
 * @returns 如果是管理员返回用户信息，否则返回错误响应
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { user, profile };
}

/**
 * 检查是否为错误响应（用于判断 requireAdmin 的返回值）
 */
export function isAdminAuthError(
  result: Awaited<ReturnType<typeof requireAdmin>>
): result is NextResponse {
  return result instanceof NextResponse;
}
