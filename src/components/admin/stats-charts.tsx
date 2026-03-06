'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { TrendingUp, Users, ShoppingCart, Zap } from 'lucide-react';

interface DailyStats {
  date: string;
  new_users: number;
  orders: number;
  revenue: number;
  credits_consumed: number;
  active_users: number;
}

export function StatsCharts() {
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 加载统计数据
  const loadStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/admin/stats?${params}`);
      const data = await response.json();

      if (response.ok) {
        if (data.stats) {
          setStats(data.stats);
        } else {
          // 单日统计数据
          setStats([data]);
        }
      } else {
        toast.error(data.error || '加载统计数据失败');
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
      toast.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 默认加载最近7天的数据
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    setEndDate(formatDate(today));
    setStartDate(formatDate(weekAgo));
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadStats();
    }
  }, [startDate, endDate]);

  // 格式化收入（分转元）
  const formatRevenue = (revenue: number) => `¥${(revenue / 100).toFixed(2)}`;

  // 计算总计
  const totals = stats.reduce(
    (acc, stat) => ({
      newUsers: acc.newUsers + stat.new_users,
      orders: acc.orders + stat.orders,
      revenue: acc.revenue + stat.revenue,
      creditsConsumed: acc.creditsConsumed + stat.credits_consumed,
      activeUsers: Math.max(acc.activeUsers, stat.active_users),
    }),
    { newUsers: 0, orders: 0, revenue: 0, creditsConsumed: 0, activeUsers: 0 }
  );

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="space-y-6">
      {/* 日期选择器 */}
      <div className="flex gap-4 items-center">
        <Input
          type="date"
          label="开始日期"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-40"
        />
        <span>至</span>
        <Input
          type="date"
          label="结束日期"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-40"
        />
        <Button
          onClick={loadStats}
          disabled={loading || !startDate || !endDate}
        >
          {loading ? '加载中...' : '刷新'}
        </Button>
      </div>

      {/* 关键指标卡片 */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">新增用户</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.newUsers}</div>
              <p className="text-xs text-muted-foreground">
                期间共新增 {totals.newUsers} 位用户
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">订单数</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.orders}</div>
              <p className="text-xs text-muted-foreground">
                期间共 {totals.orders} 笔订单
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">收入</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRevenue(totals.revenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                总收入 {formatRevenue(totals.revenue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">积分消耗</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totals.creditsConsumed}
              </div>
              <p className="text-xs text-muted-foreground">
                期间共消耗 {totals.creditsConsumed} 积分
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 收入趋势图 */}
      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>收入趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis tickFormatter={(value) => `¥${(value / 100).toFixed(0)}`} />
                <Tooltip
                  labelFormatter={(label) => new Date(label).toLocaleDateString('zh-CN')}
                  formatter={(value: number) => [formatRevenue(value), '收入']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="收入"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 用户增长图 */}
      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>用户增长</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip
                  labelFormatter={(label) => new Date(label).toLocaleDateString('zh-CN')}
                />
                <Legend />
                <Bar dataKey="new_users" fill="#8884d8" name="新增用户" />
                <Bar dataKey="active_users" fill="#82ca9d" name="活跃用户" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 积分消耗统计 */}
      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>积分消耗</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip
                  labelFormatter={(label) => new Date(label).toLocaleDateString('zh-CN')}
                />
                <Legend />
                <Bar dataKey="credits_consumed" fill="#ffc658" name="积分消耗" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
