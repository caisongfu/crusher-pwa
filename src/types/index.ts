// =============================================
// 用户 & Profile
// =============================================
export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string               // 同 auth.users.id
  username: string | null
  role: UserRole
  credits: number
  created_at: string
  updated_at: string
}

// =============================================
// 文档（原始内容）
// =============================================
export type SourceType = 'text' | 'voice'

export interface Document {
  id: string
  user_id: string
  title: string | null
  raw_content: string
  char_count: number
  source_type: SourceType
  is_deleted: boolean
  created_at: string
  updated_at: string
}

// =============================================
// 透镜
// =============================================
export type LensType =
  | 'requirements'
  | 'meeting'
  | 'review'
  | 'risk'
  | 'change'
  | 'postmortem'
  | 'tech'
  | 'custom'

export interface CustomLens {
  id: string
  user_id: string
  name: string
  icon: string
  description: string | null
  system_prompt: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// =============================================
// AI 分析结果
// =============================================
export interface Insight {
  id: string
  document_id: string
  user_id: string
  lens_type: LensType
  custom_lens_id: string | null
  result: string
  model: string
  prompt_version: string
  input_chars: number | null
  input_tokens: number | null
  output_tokens: number | null
  credits_cost: number
  created_at: string
}

// =============================================
// 积分 & 支付
// =============================================
export type TransactionType = 'payment' | 'manual_grant' | 'consumed' | 'admin_deduct' | 'refund'

export interface CreditTransaction {
  id: string
  user_id: string
  amount: number           // 正数=充值，负数=消耗
  balance_after: number
  type: TransactionType
  description: string | null
  related_insight_id: string | null
  related_order_id: string | null
  operated_by: string | null
  created_at: string
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface PaymentOrder {
  id: string
  user_id: string
  out_trade_no: string
  platform_order: string | null
  package_name: string
  amount_fen: number       // 单位：分
  credits_granted: number
  payment_method: string | null
  status: PaymentStatus
  paid_at: string | null
  created_at: string
}

// 套餐配置
export const PACKAGES = {
  '入门包': { credits: 100, amount_fen: 1000 },   // ¥10
  '标准包': { credits: 500, amount_fen: 4500 },   // ¥45
  '专业包': { credits: 1200, amount_fen: 9600 },  // ¥96
} as const

export type PackageName = keyof typeof PACKAGES

// =============================================
// 反馈
// =============================================
export type FeedbackType = 'payment' | 'bug' | 'feature' | 'other'
export type FeedbackStatus = 'pending' | 'processing' | 'resolved' | 'closed'

export interface Feedback {
  id: string
  user_id: string
  type: FeedbackType
  title: string
  content: string
  context_url: string | null
  related_order_id: string | null
  related_insight_id: string | null
  status: FeedbackStatus
  admin_note: string | null
  handled_by: string | null
  created_at: string
  updated_at: string
}

// =============================================
// 系统管理
// =============================================
export interface SystemPrompt {
  id: string
  lens_type: string
  version: string
  system_prompt: string
  is_active: boolean
  notes: string | null
  created_by: string | null
  created_at: string
}

export type AnnouncementType = 'info' | 'warning' | 'maintenance'

export interface Announcement {
  id: string
  title: string
  content: string
  type: AnnouncementType
  is_active: boolean
  expires_at: string | null
  created_by: string | null
  created_at: string
}

// 订单状态别名（与 PaymentStatus 保持一致）
export type OrderStatus = PaymentStatus

// =============================================
// 退款请求
// =============================================
export type RefundStatus = 'pending' | 'approved' | 'rejected'

export interface RefundRequest {
  id: string
  order_id: string
  user_id: string
  reason: string
  refund_amount: number
  requested_by: string
  status: RefundStatus
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  created_at: string
}

// =============================================
// 每日统计
// =============================================
export interface DailyStats {
  date: string
  new_users: number
  orders: number
  revenue: number
  credits_consumed: number
  active_users: number
}

// =============================================
// 积分计算（前端实时预览）
// =============================================
export function calculateCreditCost(charCount: number): number {
  if (charCount <= 3000) return 10
  if (charCount <= 6000) return 15
  if (charCount <= 10000) return 22
  return 22 + Math.ceil((charCount - 10000) / 1000) * 5
}
