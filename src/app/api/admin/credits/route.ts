// src/app/api/admin/credits/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const AdminCreditsSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().refine(n => n !== 0, { message: 'Amount cannot be zero' }),
  description: z.string().min(1).max(200),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 验证请求者是管理员
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!adminProfile || (adminProfile as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = AdminCreditsSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { userId, amount, description } = parsed.data

  // 使用 service role client 绕过 RLS
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. 获取用户当前积分
  const { data: targetProfile, error: profileError } = await serviceClient
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (profileError || !targetProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const newBalance = targetProfile.credits + amount

  // 防止积分变为负数（只在扣减时检查）
  if (newBalance < 0) {
    return NextResponse.json(
      { error: `积分不足：当前 ${targetProfile.credits}，扣减 ${Math.abs(amount)}` },
      { status: 400 }
    )
  }

  // 2. 更新积分
  const { error: updateError } = await serviceClient
    .from('profiles')
    .update({ credits: newBalance, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 })
  }

  // 3. 记录流水
  const transactionType = amount > 0 ? 'manual_grant' : 'admin_deduct'
  const { error: txError } = await serviceClient
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount,
      balance_after: newBalance,
      type: transactionType,
      description,
      operated_by: user.id,
    })

  if (txError) {
    // 流水插入失败不回滚，但记录错误（积分已更新）
    console.error('Failed to insert credit transaction:', txError)
  }

  return NextResponse.json({ newBalance })
}
