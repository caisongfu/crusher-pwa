'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
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
import { Search, Shield, ShieldOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface User {
  id: string;
  email: string;
  username: string | null;
  credits: number;
  disable_type: 'normal' | 'login_disabled' | 'usage_disabled';
  created_at: string;
}

interface UserListProps {
  onSelectUser: (userId: string) => void;
}

export function UserList({ onSelectUser }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // 筛选状态
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 500);
  const [status, setStatus] = useState<string>('');
  const [creditsMin, setCreditsMin] = useState('');
  const [creditsMax, setCreditsMax] = useState('');

  // 加载用户列表
  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (debouncedSearch) params.append('search', debouncedSearch);
      if (status && status !== 'all') params.append('status', status);
      if (creditsMin) params.append('creditsMin', creditsMin);
      if (creditsMax) params.append('creditsMax', creditsMax);

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users);
        setTotal(data.total);
      } else {
        toast.error(data.error || '加载用户列表失败');
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
      toast.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, debouncedSearch, status, creditsMin, creditsMax]);

  // 切换用户状态
  const handleToggleDisable = async (userId: string, currentStatus: string) => {
    const newStatus =
      currentStatus === 'normal' ? 'login_disabled' : 'normal';

    if (!confirm(`确定要${newStatus === 'normal' ? '启用' : '禁用'}该用户吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disable_type: newStatus }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('用户状态更新成功');
        loadUsers();
      } else {
        toast.error(data.error || '更新失败');
      }
    } catch (error) {
      console.error('更新用户状态失败:', error);
      toast.error('更新用户状态失败');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="搜索用户名或邮箱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="normal">正常</SelectItem>
            <SelectItem value="login_disabled">禁止登录</SelectItem>
            <SelectItem value="usage_disabled">禁止使用</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="最小积分"
          value={creditsMin}
          onChange={(e) => setCreditsMin(e.target.value)}
          className="w-32"
        />

        <Input
          type="number"
          placeholder="最大积分"
          value={creditsMax}
          onChange={(e) => setCreditsMax(e.target.value)}
          className="w-32"
        />
      </div>

      {/* 用户列表 */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户</TableHead>
              <TableHead>积分</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>注册时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  加载中...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  暂无用户
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.email}</div>
                      {user.username && (
                        <div className="text-sm text-gray-500">
                          {user.username}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.credits}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.disable_type === 'normal' ? 'default' : 'destructive'
                      }
                    >
                      {user.disable_type === 'normal'
                        ? '正常'
                        : user.disable_type === 'login_disabled'
                        ? '禁止登录'
                        : '禁止使用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('zh-CN')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectUser(user.id)}
                      >
                        详情
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleToggleDisable(user.id, user.disable_type)
                        }
                      >
                        {user.disable_type === 'normal' ? (
                          <ShieldOff className="w-4 h-4" />
                        ) : (
                          <Shield className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
