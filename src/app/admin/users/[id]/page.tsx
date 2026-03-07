'use client';

import { useParams, useRouter } from 'next/navigation';
import { UserDetail } from '@/components/admin/user-detail';

export default function AdminUserDetailPage() {
  const { id: userId } = useParams<{ id: string }>();
  const router = useRouter();

  if (!userId) {
    return <div>用户 ID 缺失</div>;
  }

  return <UserDetail userId={userId} onBack={() => router.push('/admin')} />;
}
