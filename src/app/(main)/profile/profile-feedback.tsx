// src/app/(main)/profile/profile-feedback.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FeedbackDialog } from '@/components/feedback-dialog'
import type { Feedback, FeedbackStatus } from '@/types'

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; color: string }> = {
  pending: { label: '⏳ 待处理', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: '🔄 处理中', color: 'bg-blue-100 text-blue-800' },
  resolved: { label: '✅ 已解决', color: 'bg-green-100 text-green-800' },
  closed: { label: '🚫 已关闭', color: 'bg-zinc-100 text-zinc-600' },
}

const TYPE_LABELS: Record<string, string> = {
  payment: '💳 支付问题',
  bug: '🐛 Bug报告',
  feature: '💡 功能建议',
  other: '📝 其他',
}

const STATUS_FILTERS: { value: FeedbackStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' },
]

interface ProfileFeedbackProps {
  feedbacks: Feedback[]
  onRefresh?: () => void
}

export function ProfileFeedback({ feedbacks, onRefresh }: ProfileFeedbackProps) {
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all')
  const [loading, setLoading] = useState(false)

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/feedbacks')
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      onRefresh?.()
    } catch {
      toast.error('加载反馈失败')
    } finally {
      setLoading(false)
    }
  }, [onRefresh])

  const filteredFeedbacks = statusFilter === 'all'
    ? feedbacks
    : feedbacks.filter(f => f.status === statusFilter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                statusFilter === value
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <FeedbackDialog
          trigger={<Button size="sm" variant="outline" disabled={loading}>
            {loading ? '加载中...' : '新建反馈'}
          </Button>}
          onSuccess={handleRefresh}
        />
      </div>

      {filteredFeedbacks.length === 0 ? (
        <p className="text-zinc-400 text-sm text-center py-8">暂无反馈记录</p>
      ) : (
        <ul className="space-y-3">
          {filteredFeedbacks.map((feedback) => {
            const statusConf = STATUS_CONFIG[feedback.status]
            return (
              <li key={feedback.id} className="border rounded-lg p-4 bg-white space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-zinc-400">
                      {TYPE_LABELS[feedback.type]}
                    </span>
                    <p className="font-medium mt-0.5">{feedback.title}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusConf.color}`}>
                    {statusConf.label}
                  </span>
                </div>
                {(feedback.status === 'resolved' || feedback.status === 'closed') && feedback.admin_note && (
                  <div className="text-sm text-zinc-600 bg-zinc-50 rounded p-2">
                    <p className="text-xs text-zinc-400 mb-1">管理员回复</p>
                    <p>{feedback.admin_note}</p>
                  </div>
                )}
                <p className="text-xs text-zinc-400">
                  {new Date(feedback.created_at).toLocaleString('zh-CN')}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
