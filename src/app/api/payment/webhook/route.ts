// src/app/api/payment/webhook/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPaymentProvider } from '@/lib/payment'

export async function POST(req: Request) {
  const provider = getPaymentProvider()
  const body = await req.text()
  const signature = req.headers.get('x-signature') ?? ''

  // 验证签名（手动模式直接放行）
  if (!provider.verifyCallback(body, signature)) {
    return new Response('Invalid signature', { status: 403 })
  }

  let callbackData
  try {
    callbackData = provider.parseCallback(body)
  } catch {
    // 手动模式不支持回调
    return new Response('ok')
  }

  if (callbackData.status !== 'paid') {
    return new Response('ok')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 幂等检查：避免重复充值
  const { data: order } = await supabase
    .from('payment_orders')
    .select('id, status, user_id, credits_granted')
    .eq('out_trade_no', callbackData.orderId)
    .single()

  if (!order || order.status === 'paid') {
    return new Response('ok')
  }

  // TODO: 实现 grantCreditsFromPayment 后调用
  // await grantCreditsFromPayment(order.user_id, order.credits_granted, order.id)

  return new Response('success')
}
