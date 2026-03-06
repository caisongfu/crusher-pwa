'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_VARIANTS, PAGINATION, type OrderStatus } from '@/lib/constants';
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

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState<number>(PAGINATION.DEFAULT_PAGE);
  const [loading, setLoading] = useState(false);

  // 筛选状态
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 500);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 加载订单列表
  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: PAGINATION.DEFAULT_LIMIT.toString(),
      });

      if (debouncedSearch) params.append('search', debouncedSearch);
      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/admin/orders?${params}`);
      const data = await response.json();

      if (response.ok) {
        setOrders(data.orders);
        setTotal(data.total);
      } else {
        toast.error(data.error || '加载订单列表失败');
      }
    } catch (error) {
      console.error('加载订单列表失败:', error);
      toast.error('加载订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, debouncedSearch, status, startDate, endDate]);

  // 状态徽章
  const getStatusBadge = (status: OrderStatus) => {
    const label = ORDER_STATUS_LABELS[status];
    const variant = ORDER_STATUS_BADGE_VARIANTS[status];
    return <Badge variant={variant as any}>{label}</Badge>;
  };

  const totalPages = useMemo(
    () => Math.ceil(total / PAGINATION.DEFAULT_LIMIT),
    [total]
  );

  return (
    <div className="space-y-6">
      {/* 搜索和筛选 */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="搜索订单号或邮箱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={status} onValueChange={(value) => setStatus(value as OrderStatus | '')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部状态</SelectItem>
            <SelectItem value={ORDER_STATUS.PENDING}>{ORDER_STATUS_LABELS[ORDER_STATUS.PENDING]}</SelectItem>
            <SelectItem value={ORDER_STATUS.PAID}>{ORDER_STATUS_LABELS[ORDER_STATUS.PAID]}</SelectItem>
            <SelectItem value={ORDER_STATUS.FAILED}>{ORDER_STATUS_LABELS[ORDER_STATUS.FAILED]}</SelectItem>
            <SelectItem value={ORDER_STATUS.REFUNDED}>{ORDER_STATUS_LABELS[ORDER_STATUS.REFUNDED]}</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          placeholder="开始日期"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-40"
        />

        <Input
          type="date"
          placeholder="结束日期"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-40"
        />
      </div>

      {/* 订单列表 */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>订单号</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>套餐</TableHead>
              <TableHead>金额</TableHead>
              <TableHead>积分</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  加载中...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  暂无订单
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
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
                      onClick={() => {
                        toast.info('订单详情功能开发中');
                      }}
                    >
                      详情
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p: number) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一页
          </Button>
          <span className="flex items-center px-4">
            第 {page} / {totalPages} 页，共 {total} 条
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
