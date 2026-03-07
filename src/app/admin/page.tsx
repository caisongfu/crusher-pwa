'use client';

import { useRouter } from 'next/navigation';
import { UserList } from '@/components/admin/user-list';

export default function AdminPage() {
  const router = useRouter();

  const handleSelectUser = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">用户管理</h2>
      <UserList onSelectUser={handleSelectUser} />
    </div>
  );
}
