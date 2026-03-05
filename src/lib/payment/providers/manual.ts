// src/lib/payment/providers/manual.ts
import { createClient } from '@supabase/supabase-js'
import type { CreateOrderParams, CreateOrderResult, CallbackData, PaymentProvider } from '../types'

export class ManualPaymentProvider implements PaymentProvider {
  name = 'manual'

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 生成我方订单号（格式：ORD-YYYYMMDD-随机6位）
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.random().toString(36).slice(2, 8).toUpperCase()
    const outTradeNo = `ORD-${date}-${random}`

    // 保存订单到数据库
    const { error } = await supabase.from('payment_orders').insert({
      user_id: params.userId,
      out_trade_no: outTradeNo,
      package_name: params.packageName,
      amount_fen: params.amountFen,
      credits_granted: params.creditsGranted,
      payment_provider: 'manual',
      status: 'pending',
    })

    if (error) throw new Error(`Failed to create order: ${error.message}`)

    const paypalLink = process.env.PAYPAL_RECEIVE_LINK ?? 'PayPal.Me/SoulfulCai'
    const amountYuan = (params.amountFen / 100).toFixed(2)

    return {
      orderId: outTradeNo,
      instructions: `请通过以下方式完成支付：

📧 PayPal: ${paypalLink}
💰 金额：¥${amountYuan}（${params.packageName}，${params.creditsGranted} 积分）
📝 备注：${outTradeNo}

支付完成后请联系管理员，提供您的注册邮箱，管理员将在24小时内充值积分。`,
    }
  }

  // 手动模式无 webhook，直接返回 true
  verifyCallback(_body: string, _signature: string): boolean {
    return true
  }

  parseCallback(_body: string): CallbackData {
    throw new Error('Manual payment provider has no callback')
  }
}
