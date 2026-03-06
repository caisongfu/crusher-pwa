-- =============================================
-- 退款审批事务处理
-- =============================================
-- 使用 PostgreSQL 函数实现事务，确保数据一致性

CREATE OR REPLACE FUNCTION refund_order(
  p_refund_request_id UUID,
  p_admin_id UUID,
  p_action TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_refund_request refund_requests%ROWTYPE;
  v_order payment_orders%ROWTYPE;
  v_current_credits INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- 查询退款请求（加锁）
  SELECT * INTO v_refund_request
  FROM refund_requests
  WHERE id = p_refund_request_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', '退款请求不存在或已处理');
  END IF;

  -- 验证审批人不是发起人
  IF v_refund_request.requested_by = p_admin_id THEN
    RETURN jsonb_build_object('error', '不能审批自己发起的退款请求');
  END IF;

  -- 查询订单
  SELECT * INTO v_order
  FROM payment_orders
  WHERE id = v_refund_request.order_id;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object('error', '订单不存在');
  END IF;

  -- 如果批准退款
  IF p_action = 'approve' THEN
    -- 获取当前积分
    SELECT credits INTO v_current_credits
    FROM profiles
    WHERE id = v_refund_request.user_id;

    IF v_current_credits IS NULL THEN
      RETURN jsonb_build_object('error', '用户不存在');
    END IF;

    v_new_balance := v_current_credits + v_refund_request.refund_amount;

    -- 更新积分
    UPDATE profiles
    SET credits = v_new_balance, updated_at = NOW()
    WHERE id = v_refund_request.user_id;

    -- 插入积分流水
    INSERT INTO credit_transactions (
      user_id, amount, balance_after, type, description,
      operated_by, related_order_id, created_at
    ) VALUES (
      v_refund_request.user_id,
      v_refund_request.refund_amount,
      v_new_balance,
      'refund',
      '退款：' || v_refund_request.reason,
      p_admin_id,
      v_refund_request.order_id,
      NOW()
    );

    -- 更新订单状态
    UPDATE payment_orders
    SET status = 'refunded', updated_at = NOW()
    WHERE id = v_refund_request.order_id;
  END IF;

  -- 更新退款请求状态
  UPDATE refund_requests
  SET status = p_action,
      approved_by = p_admin_id,
      approved_at = NOW(),
      rejection_reason = p_rejection_reason
  WHERE id = p_refund_request.id;

  RETURN jsonb_build_object('success', true, 'message',
    CASE
      WHEN p_action = 'approve' THEN '退款已批准，积分已回退'
      ELSE '退款已拒绝'
    END
  );
END;
$$;

-- =============================================
-- 数据库索引优化
-- =============================================

-- 订单表索引
CREATE INDEX IF NOT EXISTS idx_payment_orders_status_created_at
ON payment_orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id
ON payment_orders(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_orders_out_trade_no
ON payment_orders(out_trade_no);

-- 退款请求表索引
CREATE INDEX IF NOT EXISTS idx_refund_requests_status
ON refund_requests(status);

CREATE INDEX IF NOT EXISTS idx_refund_requests_order_id
ON refund_requests(order_id);

CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at
ON refund_requests(created_at DESC);

-- 信用交易表索引
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id
ON credit_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at
ON credit_transactions(created_at DESC);
