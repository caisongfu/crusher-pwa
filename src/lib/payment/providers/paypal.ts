// src/lib/payment/providers/paypal.ts
import type { CreateOrderParams, CreateOrderResult, CallbackData, PaymentProvider } from '../types'

export class PayPalProvider implements PaymentProvider {
  name = 'paypal'

  async createOrder(_params: CreateOrderParams): Promise<CreateOrderResult> {
    throw new Error('PayPalProvider: not implemented yet')
  }

  verifyCallback(_body: string, _signature: string): boolean {
    throw new Error('PayPalProvider: not implemented yet')
  }

  parseCallback(_body: string): CallbackData {
    throw new Error('PayPalProvider: not implemented yet')
  }
}
