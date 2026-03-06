/**
 * 订单状态常量
 */
export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: '待支付',
  [ORDER_STATUS.PAID]: '已支付',
  [ORDER_STATUS.FAILED]: '失败',
  [ORDER_STATUS.REFUNDED]: '已退款',
} as const;

export const ORDER_STATUS_BADGE_VARIANTS = {
  [ORDER_STATUS.PENDING]: 'default',
  [ORDER_STATUS.PAID]: 'default',
  [ORDER_STATUS.FAILED]: 'destructive',
  [ORDER_STATUS.REFUNDED]: 'secondary',
} as const;

/**
 * 退款请求状态常量
 */
export const REFUND_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type RefundStatus = (typeof REFUND_STATUS)[keyof typeof REFUND_STATUS];

export const REFUND_STATUS_LABELS = {
  [REFUND_STATUS.PENDING]: '待审批',
  [REFUND_STATUS.APPROVED]: '已批准',
  [REFUND_STATUS.REJECTED]: '已拒绝',
} as const;

/**
 * HTTP 状态码和消息
 */
export const HTTP_STATUS = {
  UNAUTHORIZED: { status: 401, message: 'Unauthorized' },
  FORBIDDEN: { status: 403, message: 'Forbidden' },
  NOT_FOUND: { status: 404, message: 'Not Found' },
  BAD_REQUEST: { status: 400, message: 'Bad Request' },
  INTERNAL_ERROR: { status: 500, message: '服务器错误' },
} as const;

/**
 * 分页配置
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
