'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface User {
  id: string;
  email: string;
  username: string | null;
  credits: number;
  disable_type: 'normal' | 'login_disabled' | 'usage_disabled';
  created_at: string;
}

interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  balance_after: number;
  created_at: string;
}

interface PendingTransaction {
  id: string;
  amount: number;
  type: 'manual_grant' | 'admin_deduct';
  description: string;
  requested_by: string;
  requested_by_email: string;
  requested_by_username: string | null;
  can_approve: boolean;
  created_at: string;
}

interface UserDetailProps {
  userId: string;
  onBack: () => void;
}

export function UserDetail({ userId, onBack }: UserDetailProps) {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // 积分操作表单
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 审批操作状态
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadUserDetail();
    loadCreditTransactions();
    loadPendingTransactions();
  }, [userId]);

  const loadUserDetail = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
      } else {
        toast.error(data.error || '加载用户详情失败');
      }
    } catch (error) {
      console.error('加载用户详情失败:', error);
      toast.error('加载用户详情失败');
    }
  };

  const loadCreditTransactions = async () => {
    try {
      const response = await fetch(`/api/admin/credits/transactions?userId=${userId}`);
      const data = await response.json();

      if (response.ok) {
        setTransactions(data.transactions || []);
      } else {
        toast.error(data.error || '加载积分流水失败');
      }
    } catch (error) {
      console.error('加载积分流水失败:', error);
      toast.error('加载积分流水失败');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingTransactions = async () => {
    try {
      const response = await fetch(`/api/admin/credits/pending?userId=${userId}`);
      const data = await response.json();

      if (response.ok) {
        setPendingTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('加载待审批记录失败:', error);
    }
  };

  const handleCreateCreditOperation = async (type: 'manual_grant' | 'admin_deduct') => {
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('请输入有效的积分数额');
      return;
    }

    if (!creditDescription.trim()) {
      toast.error('请填写备注');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: type === 'manual_grant' ? amount : -amount,
          type,
          description: creditDescription,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('积分操作已提交，等待其他管理员审批后生效');
        setCreditAmount('');
        setCreditDescription('');
        loadPendingTransactions();
      } else {
        toast.error(data.error || '提交失败');
      }
    } catch (error) {
      console.error('提交积分操作失败:', error);
      toast.error('提交积分操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (transactionId: string) => {
    setApproving(transactionId);
    try {
      const response = await fetch('/api/admin/credits/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, action: 'approve' }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('审批通过，积分已生效');
        loadUserDetail();
        loadCreditTransactions();
        loadPendingTransactions();
      } else {
        toast.error(data.error || '审批失败');
      }
    } catch (error) {
      console.error('审批失败:', error);
      toast.error('审批失败');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (transactionId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('请填写拒绝原因');
      return;
    }

    setApproving(transactionId);
    try {
      const response = await fetch('/api/admin/credits/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          action: 'reject',
          rejectionReason,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('已拒绝该积分操作');
        setRejectingId(null);
        setRejectionReason('');
        loadPendingTransactions();
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      console.error('拒绝失败:', error);
      toast.error('操作失败');
    } finally {
      setApproving(null);
    }
  };

  if (loading) {
    return <div>加载中...</div>;
  }

  if (!user) {
    return <div>用户不存在</div>;
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        返回列表
      </Button>

      {/* 用户信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>用户信息</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">邮箱</dt>
              <dd className="text-lg font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">用户名</dt>
              <dd className="text-lg font-medium">{user.username || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">当前积分（已审批生效）</dt>
              <dd className="text-lg font-medium">{user.credits}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">注册时间</dt>
              <dd className="text-lg font-medium">
                {new Date(user.created_at).toLocaleString('zh-CN')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">状态</dt>
              <dd className="text-lg font-medium">
                {user.disable_type === 'normal'
                  ? '正常'
                  : user.disable_type === 'login_disabled'
                  ? '禁止登录'
                  : '禁止使用'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* 积分操作表单 */}
      <Card>
        <CardHeader>
          <CardTitle>积分操作（需要第二管理员审批后生效）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">积分数额</label>
              <Input
                type="number"
                placeholder="请输入积分数额"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">备注（必填）</label>
              <Textarea
                placeholder="请填写操作原因..."
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleCreateCreditOperation('manual_grant')}
                disabled={submitting}
              >
                充值
              </Button>
              <Button
                variant="outline"
                onClick={() => handleCreateCreditOperation('admin_deduct')}
                disabled={submitting}
              >
                扣减
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 待审批积分操作 */}
      {pendingTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              待审批积分操作（{pendingTransactions.length}）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingTransactions.map((tx) => (
              <div key={tx.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          tx.amount > 0
                            ? 'font-medium text-green-600'
                            : 'font-medium text-red-600'
                        }
                      >
                        {tx.amount > 0 ? '+' : ''}
                        {tx.amount} 积分
                      </span>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                        {tx.type === 'manual_grant' ? '手动充值' : '管理员扣减'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{tx.description}</p>
                    <p className="text-xs text-gray-400">
                      发起人：{tx.requested_by_username || tx.requested_by_email} ·{' '}
                      {new Date(tx.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {tx.can_approve ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(tx.id)}
                          disabled={approving === tx.id}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          通过
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setRejectingId(rejectingId === tx.id ? null : tx.id)
                          }
                          disabled={approving === tx.id}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          拒绝
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">等待其他管理员审批</span>
                    )}
                  </div>
                </div>
                {/* 拒绝原因输入区 */}
                {rejectingId === tx.id && (
                  <div className="space-y-2 pt-2 border-t">
                    <Textarea
                      placeholder="请填写拒绝原因..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(tx.id)}
                        disabled={approving === tx.id}
                      >
                        确认拒绝
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectionReason('');
                        }}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 积分流水（已生效记录） */}
      <Card>
        <CardHeader>
          <CardTitle>积分流水（已审批生效）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>余额</TableHead>
                <TableHead>备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    暂无积分流水
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      {new Date(tx.created_at).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <span
                        className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}
                      >
                        {tx.type === 'payment' && '充值'}
                        {tx.type === 'consumed' && '消费'}
                        {tx.type === 'manual_grant' && '手动充值'}
                        {tx.type === 'admin_deduct' && '管理员扣减'}
                        {tx.type === 'refund' && '退款'}
                      </span>
                    </TableCell>
                    <TableCell
                      className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount}
                    </TableCell>
                    <TableCell>{tx.balance_after}</TableCell>
                    <TableCell>{tx.description || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
