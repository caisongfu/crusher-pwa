'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Feedback, FeedbackType, FeedbackStatus } from '@/types'

const TYPE_LABELS: Record<FeedbackType, string> = {
  payment: '支付相关',
  bug: 'Bug 反馈',
  feature: '功能建议',
  other: '其他',
}

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  closed: '已关闭',
}

const STATUS_VARIANTS: Record<FeedbackStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  processing: 'default',
  resolved: 'secondary',
  closed: 'destructive',
}

const TYPE_COLORS: Record<FeedbackType, string> = {
  payment: 'bg-green-100 text-green-800',
  bug: 'bg-red-100 text-red-800',
  feature: 'bg-blue-100 text-blue-800',
  other: 'bg-gray-100 text-gray-800',
}

export default function AdminFeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [formData, setFormData] = useState({
    status: 'processing' as FeedbackStatus,
    adminNote: '',
  })

  useEffect(() => {
    fetchFeedbacks()
    fetchStats()
  }, [selectedStatus, selectedType])

  async function fetchFeedbacks() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedStatus) params.append('status', selectedStatus)
      if (selectedType) params.append('type', selectedType)

      const response = await fetch(`/api/admin/feedbacks?${params}`)
      const data = await response.json()

      if (response.ok) {
        setFeedbacks(data.feedbacks)
      } else {
        toast.error(data.error || '加载失败')
      }
    } catch (error) {
      console.error('加载反馈失败:', error)
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    setStatsLoading(true)
    try {
      const response = await fetch('/api/admin/feedbacks/stats')
      const data = await response.json()

      if (response.ok) {
        setStats(data)
      } else {
        toast.error(data.error || '加载统计失败')
      }
    } catch (error) {
      console.error('加载统计失败:', error)
      toast.error('加载统计失败')
    } finally {
      setStatsLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!selectedFeedback) return

    try {
      const response = await fetch(`/api/admin/feedbacks/${selectedFeedback.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: formData.status,
          adminNote: formData.adminNote,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('状态已更新')
        setIsDialogOpen(false)
        setSelectedFeedback(null)
        fetchFeedbacks()
        fetchStats()
      } else {
        toast.error(data.error || '更新失败')
      }
    } catch (error) {
      console.error('更新状态失败:', error)
      toast.error('更新失败')
    }
  }

  const handleEditFeedback = (feedback: Feedback) => {
    setSelectedFeedback(feedback)
    setFormData({
      status: feedback.status,
      adminNote: feedback.admin_note || '',
    })
    setIsDialogOpen(true)
  }

  const filteredFeedbacks = feedbacks

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">用户反馈</h1>
      </div>

      {/* 统计卡片 */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">加载中...</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">-</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">今日反馈</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.todayCount || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">待处理</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {stats?.statsByStatus?.find((s: any) => s.status === 'pending')?.count || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">已解决</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {stats?.statsByStatus?.find((s: any) => s.status === 'resolved')?.count || 0}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 筛选器 */}
      <Card>
        <CardHeader>
          <CardTitle>筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <Select.Trigger className="w-[200px]">
                <Select.Placeholder>反馈类型</Select.Placeholder>
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="">全部类型</Select.Item>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <Select.Item key={value} value={value}>
                    {label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <Select.Trigger className="w-[200px]">
                <Select.Placeholder>状态</Select.Placeholder>
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="">全部状态</Select.Item>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <Select.Item key={value} value={value}>
                    {label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>

            <Button variant="outline" onClick={() => setSelectedStatus('')}>
              重置筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 反馈列表 */}
      <Card>
        <CardHeader>
          <CardTitle>反馈列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-400">加载中...</p>
          ) : filteredFeedbacks.length === 0 ? (
            <p className="text-center py-8 text-gray-400">暂无反馈</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类型</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedbacks.map((feedback) => (
                  <TableRow key={feedback.id}>
                    <TableCell>
                      <Badge className={TYPE_COLORS[feedback.type]}>
                        {TYPE_LABELS[feedback.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{feedback.title}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[feedback.status]}>
                        {STATUS_LABELS[feedback.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{feedback.user_email}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(feedback.created_at), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditFeedback(feedback)}
                      >
                        处理
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 处理对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>处理反馈 - {selectedFeedback?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">当前状态</Label>
              <Badge variant={STATUS_VARIANTS[selectedFeedback?.status]}>
                {STATUS_LABELS[selectedFeedback?.status]}
              </Badge>
            </div>

            <div>
              <Label className="text-sm font-medium">反馈内容</Label>
              <p className="mt-1 p-3 bg-gray-50 rounded text-sm">
                {selectedFeedback?.content}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">设置新状态</Label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as FeedbackStatus })}
                className="w-full mt-1 p-2 border rounded-md"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-sm font-medium">管理员备注</Label>
              <Textarea
                value={formData.adminNote}
                onChange={(e) => setFormData({ ...formData, adminNote: e.target.value })}
                placeholder="请填写处理备注..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleStatusUpdate}>
                更新状态
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}