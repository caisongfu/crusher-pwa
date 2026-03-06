import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/server';
import { AdminLayout } from '@/components/admin/admin-layout';

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  // 验证用户登录
  if (!profile) {
    redirect('/login');
  }

  // 验证管理员权限
  if (profile.role !== 'admin') {
    redirect('/?error=insufficient_permissions');
  }

  return <AdminLayout>{children}</AdminLayout>;
}
