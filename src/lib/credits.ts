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

  const result = await supabase.rpc('deduct_credits', {
    p_user_id: userId,
    p_cost: cost,
    p_description: description,
    p_related_insight_id: insightId ?? null,
  })

  const { data, error } = result as {
    data: DeductResult | null
    error: { message: string } | null
  }

  if (error) {
    console.error('deductCredits RPC error:', error)
    return { success: false, reason: 'db_error' }
  }

  return data as DeductResult
}
