import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_VARIANTS, type OrderStatus } from '@/lib/constants';
import { formatFenToYuan, formatDateToCN } from '@/lib/format';

interface Order {
  id: string;
  user_id: string;
  out_trade_no: string;
  package_name: string;
  amount_fen: number;
  credits_granted: number;
  status: OrderStatus;
  paid_at: string | null;
  created_at: string;
  user: {
    id: string;
    email: string;
    username: string | null;
  };
}

interface OrderRowProps {
  order: Order;
}

/**
 * 订单行组件
 *
 * 使用 React.memo 优化，避免不必要的重新渲染
 */
export const OrderRow = React.memo(({ order }: OrderRowProps) => {
  const getStatusBadge = (status: OrderStatus) => {
    const label = ORDER_STATUS_LABELS[status];
    const variant = ORDER_STATUS_BADGE_VARIANTS[status];
    return <Badge variant={variant as any}>{label}</Badge>;
  };

  const handleViewDetails = () => {
    // TODO: 实现订单详情查看功能
    console.log('查看订单详情:', order.id);
  };

  return (
    <>
      <TableCell className="font-mono text-sm">
        {order.out_trade_no}
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{order.user.email}</div>
          {order.user.username && (
            <div className="text-sm text-gray-500">
              {order.user.username}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>{order.package_name}</TableCell>
      <TableCell>{formatFenToYuan(order.amount_fen)}</TableCell>
      <TableCell>{order.credits_granted}</TableCell>
      <TableCell>{getStatusBadge(order.status)}</TableCell>
      <TableCell>{formatDateToCN(order.created_at)}</TableCell>
      <TableCell className="text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewDetails}
        >
          详情
        </Button>
      </TableCell>
    </>
  );
});

OrderRow.displayName = 'OrderRow';

export default OrderRow;
