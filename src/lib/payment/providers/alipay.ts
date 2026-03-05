// src/lib/payment/providers/alipay.ts
import type { CreateOrderParams, CreateOrderResult, CallbackData, PaymentProvider } from '../types'

export class AlipayProvider implements PaymentProvider {
  name = 'alipay'

  async createOrder(_params: CreateOrderParams): Promise<CreateOrderResult> {
    throw new Error('AlipayProvider: not implemented yet')
  }

  verifyCallback(_body: string, _signature: string): boolean {
    throw new Error('AlipayProvider: not implemented yet')
  }

  parseCallback(_body: string): CallbackData {
    throw new Error('AlipayProvider: not implemented yet')
  }
}
