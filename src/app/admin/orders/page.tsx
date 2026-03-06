'use client';

import { OrderList } from '@/components/admin/order-list';

export default function AdminOrdersPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">订单管理</h2>
      <OrderList />
    </div>
  );
}
