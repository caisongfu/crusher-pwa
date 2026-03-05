// src/lib/payment/index.ts
import type { PaymentProvider } from './types'
import { ManualPaymentProvider } from './providers/manual'
import { HupijiaoProvider } from './providers/hupijiao'
import { AlipayProvider } from './providers/alipay'
import { PayPalProvider } from './providers/paypal'

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? 'manual'

  switch (provider) {
    case 'hupijiao': return new HupijiaoProvider()
    case 'alipay':   return new AlipayProvider()
    case 'paypal':   return new PayPalProvider()
    default:         return new ManualPaymentProvider()
  }
}

export type { PaymentProvider, CreateOrderParams, CreateOrderResult, CallbackData } from './types'
