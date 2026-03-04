-- =============================================
-- 积分原子扣减数据库函数（防并发超扣）
-- =============================================
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_cost INTEGER,
  p_description TEXT,
  p_related_insight_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- 加行锁，防并发
  SELECT credits INTO v_current_credits
  FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF v_current_credits < p_cost THEN
    RETURN json_build_object('success', false, 'reason', 'insufficient_credits');
  END IF;

  v_new_balance := v_current_credits - p_cost;

  UPDATE profiles SET credits = v_new_balance WHERE id = p_user_id;

  INSERT INTO credit_transactions
    (user_id, amount, balance_after, type, description, related_insight_id)
  VALUES
    (p_user_id, -p_cost, v_new_balance, 'consumed', p_description, p_related_insight_id);

  RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql;
