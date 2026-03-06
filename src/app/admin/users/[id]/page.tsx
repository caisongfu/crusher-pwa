'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { UserDetail } from '@/components/admin/user-detail';

export default function AdminUserDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get('id');

  if (!userId) {
    return <div>用户 ID 缺失</div>;
  }

  return <UserDetail userId={userId} onBack={() => router.push('/admin')} />;
}
