import { createAdminClient } from '@/lib/supabase/server'

interface DeductResult {
  success: boolean
  newBalance?: number
  reason?: string
}

export async function deductCredits(
  userId: string,
  cost: number,
  description: string,
  insightId?: string
): Promise<DeductResult> {
  const supabase = createAdminClient()

  // 查询当前积分余额
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    console.error('deductCredits: 用户不存在', profileError)
    return { success: false, reason: 'user_not_found' }
  }

  const currentCredits = (profile as any).credits as number
  if (currentCredits < cost) {
    return { success: false, reason: 'insufficient_credits' }
  }

  const newBalance = currentCredits - cost

  // 扣减积分（带乐观锁：要求当前积分 >= cost 才执行）
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: newBalance })
    .eq('id', userId)
    .gte('credits', cost)

  if (updateError) {
    console.error('deductCredits: 积分更新失败', updateError)
    return { success: false, reason: 'db_error' }
  }

  // 记录交易流水（失败不回滚，仅记录日志）
  const { error: txError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: -cost,
      balance_after: newBalance,
      type: 'consumed',
      description,
      related_insight_id: insightId ?? null,
    } as any)

  if (txError) {
    console.error('deductCredits: 交易记录写入失败', txError)
  }

  return { success: true, newBalance }
}
