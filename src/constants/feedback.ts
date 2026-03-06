import type { FeedbackType, FeedbackStatus } from '@/types'

export const TYPE_LABELS: Record<FeedbackType, string> = {
  payment: '支付相关',
  bug: 'Bug 反馈',
  feature: '功能建议',
  other: '其他',
}

export const STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  closed: '已关闭',
}

export const STATUS_VARIANTS: Record<FeedbackStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  processing: 'default',
  resolved: 'secondary',
  closed: 'destructive',
}

export const TYPE_COLORS: Record<FeedbackType, string> = {
  payment: 'bg-green-100 text-green-800',
  bug: 'bg-red-100 text-red-800',
  feature: 'bg-blue-100 text-blue-800',
  other: 'bg-gray-100 text-gray-800',
}
