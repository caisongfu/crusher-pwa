-- 退款申请表
CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 每日统计预聚合表
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  total_insights INTEGER DEFAULT 0,
  total_credits_consumed INTEGER DEFAULT 0,
  total_revenue_fen INTEGER DEFAULT 0,
  lens_distribution JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_refund_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_order ON refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_user ON refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date DESC);

-- RLS 策略
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_refunds" ON refund_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_stats" ON daily_stats FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 获取今日统计（实时）
CREATE OR REPLACE FUNCTION get_today_stats() RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'date', CURRENT_DATE,
    'total_users', (SELECT COUNT(*) FROM profiles),
    'active_users', (SELECT COUNT(DISTINCT user_id) FROM insights WHERE created_at >= CURRENT_DATE),
    'total_insights', (SELECT COUNT(*) FROM insights WHERE created_at >= CURRENT_DATE),
    'total_credits_consumed', COALESCE((SELECT SUM(credits_cost) FROM insights WHERE created_at >= CURRENT_DATE), 0),
    'lens_distribution', COALESCE((
      SELECT json_object_agg(lens_type, count)
      FROM (
        SELECT lens_type, COUNT(*) as count
        FROM insights
        WHERE created_at >= CURRENT_DATE
        GROUP BY lens_type
      ) subquery
    ), '{}'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 更新每日统计（定时任务调用）
CREATE OR REPLACE FUNCTION update_daily_stats(p_date DATE DEFAULT CURRENT_DATE) RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_stats (date, total_users, active_users, total_insights, total_credits_consumed, total_revenue_fen, lens_distribution)
  VALUES (
    p_date,
    (SELECT COUNT(*) FROM profiles WHERE created_at < p_date + INTERVAL '1 day'),
    (SELECT COUNT(DISTINCT user_id) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'),
    (SELECT COUNT(*) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'),
    COALESCE((SELECT SUM(credits_cost) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'), 0),
    COALESCE((SELECT SUM(amount_fen) FROM payment_orders WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day' AND status = 'paid'), 0),
    COALESCE((
      SELECT json_object_agg(lens_type, count)
      FROM (
        SELECT lens_type, COUNT(*) as count
        FROM insights
        WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'
        GROUP BY lens_type
      ) subquery
    ), '{}'::jsonb)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    total_insights = EXCLUDED.total_insights,
    total_credits_consumed = EXCLUDED.total_credits_consumed,
    total_revenue_fen = EXCLUDED.total_revenue_fen,
    lens_distribution = EXCLUDED.lens_distribution,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
