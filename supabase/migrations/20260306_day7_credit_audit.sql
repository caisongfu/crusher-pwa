-- 待审批积分操作表
CREATE TABLE IF NOT EXISTS pending_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('manual_grant', 'admin_deduct')),
  description TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 积分操作审计表（不可修改）
CREATE TABLE IF NOT EXISTS credit_operations_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('grant', 'deduct', 'approve', 'reject')),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER,
  balance_before INTEGER,
  balance_after INTEGER,
  operator_id UUID NOT NULL REFERENCES profiles(id),
  operation_time TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  details JSONB
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_pending_credit_status ON pending_credit_transactions(status);
CREATE INDEX IF NOT EXISTS idx_pending_credit_user ON pending_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_operation_time ON credit_operations_audit(operation_time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_operator ON credit_operations_audit(operator_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON credit_operations_audit(user_id);

-- RLS 策略
ALTER TABLE pending_credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_pending_credits" ON pending_credit_transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER TABLE credit_operations_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_audit" ON credit_operations_audit FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "prevent_audit_modification" ON credit_operations_audit FOR DELETE USING (false);
CREATE POLICY "prevent_audit_update" ON credit_operations_audit FOR UPDATE USING (false);

-- 触发器：自动记录审计日志
CREATE OR REPLACE FUNCTION trigger_credit_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO credit_operations_audit (
      operation_type,
      user_id,
      amount,
      balance_before,
      balance_after,
      operator_id,
      ip_address,
      user_agent,
      details
    )
    VALUES (
      'grant',
      NEW.user_id,
      NEW.amount,
      NULL,
      NULL,
      NEW.requested_by,
      NULL,
      NULL,
      jsonb_build_object(
        'transaction_id', NEW.id,
        'type', NEW.type,
        'description', NEW.description
      )
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 在 pending_credit_transactions 上创建触发器
DROP TRIGGER IF EXISTS on_credit_transaction_insert ON pending_credit_transactions;
CREATE TRIGGER on_credit_transaction_insert
  AFTER INSERT ON pending_credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_credit_audit();
