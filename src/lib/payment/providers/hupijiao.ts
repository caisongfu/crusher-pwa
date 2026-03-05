// src/lib/payment/providers/hupijiao.ts
import type { CreateOrderParams, CreateOrderResult, CallbackData, PaymentProvider } from '../types'

export class HupijiaoProvider implements PaymentProvider {
  name = 'hupijiao'

  async createOrder(_params: CreateOrderParams): Promise<CreateOrderResult> {
    throw new Error('HupijiaoProvider: not implemented yet')
  }

  verifyCallback(_body: string, _signature: string): boolean {
    throw new Error('HupijiaoProvider: not implemented yet')
  }

  parseCallback(_body: string): CallbackData {
    throw new Error('HupijiaoProvider: not implemented yet')
  }
}
