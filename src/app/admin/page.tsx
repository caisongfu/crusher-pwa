'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserList } from '@/components/admin/user-list';

export default function AdminPage() {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    router.push(`/admin/users?id=${userId}`);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">用户管理</h2>
      <UserList onSelectUser={handleSelectUser} />
    </div>
  );
}
