// src/lib/payment/types.ts
import type { PackageName } from '@/types'

export interface CreateOrderParams {
  userId: string
  packageName: PackageName
  amountFen: number        // 支付金额（分）
  creditsGranted: number   // 充值积分数
}

export interface CreateOrderResult {
  orderId: string          // 我方订单号
  paymentUrl?: string      // 自动支付跳转链接（auto providers）
  instructions?: string    // 手动支付说明（manual provider）
}

export interface CallbackData {
  orderId: string          // 我方订单号（out_trade_no）
  platformOrder?: string   // 第三方平台订单号
  status: 'paid' | 'failed'
  amountFen: number
}

// Provider 接口——所有支付提供商必须实现此接口
export interface PaymentProvider {
  name: string
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>
  verifyCallback(body: string, signature: string): boolean
  parseCallback(body: string): CallbackData
}
