// src/app/api/payment/create/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getPaymentProvider } from '@/lib/payment'
import { PACKAGES, type PackageName } from '@/types'

const CreatePaymentSchema = z.object({
  packageName: z.enum(['入门包', '标准包', '专业包'] as [PackageName, ...PackageName[]]),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = CreatePaymentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid package name' }, { status: 400 })
  }

  const { packageName } = parsed.data
  const pkg = PACKAGES[packageName]

  const provider = getPaymentProvider()

  const result = await provider.createOrder({
    userId: user.id,
    packageName,
    amountFen: pkg.amount_fen,
    creditsGranted: pkg.credits,
  })

  return NextResponse.json({
    orderId: result.orderId,
    paymentUrl: result.paymentUrl ?? null,
    instructions: result.instructions ?? null,
    provider: provider.name,
  })
}
