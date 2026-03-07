-- =============================================
-- Token 用量统计：daily_stats 新增 token 字段
-- =============================================

-- 1. 新增两列
ALTER TABLE daily_stats
  ADD COLUMN IF NOT EXISTS total_input_tokens  BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_output_tokens BIGINT NOT NULL DEFAULT 0;

-- 2. 更新 get_today_stats 函数（实时今日统计）
CREATE OR REPLACE FUNCTION get_today_stats() RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'date',                   CURRENT_DATE,
    'total_users',            (SELECT COUNT(*) FROM profiles),
    'active_users',           (SELECT COUNT(DISTINCT user_id) FROM insights WHERE created_at >= CURRENT_DATE),
    'total_insights',         (SELECT COUNT(*) FROM insights WHERE created_at >= CURRENT_DATE),
    'total_credits_consumed', COALESCE((SELECT SUM(credits_cost)    FROM insights WHERE created_at >= CURRENT_DATE), 0),
    'total_input_tokens',     COALESCE((SELECT SUM(input_tokens)    FROM insights WHERE created_at >= CURRENT_DATE), 0),
    'total_output_tokens',    COALESCE((SELECT SUM(output_tokens)   FROM insights WHERE created_at >= CURRENT_DATE), 0),
    'lens_distribution',      COALESCE((
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

-- 3. 更新 update_daily_stats 函数（定时汇总归档）
CREATE OR REPLACE FUNCTION update_daily_stats(p_date DATE DEFAULT CURRENT_DATE) RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_stats (
    date, total_users, active_users, total_insights,
    total_credits_consumed, total_revenue_fen,
    total_input_tokens, total_output_tokens,
    lens_distribution
  )
  VALUES (
    p_date,
    (SELECT COUNT(*) FROM profiles WHERE created_at < p_date + INTERVAL '1 day'),
    (SELECT COUNT(DISTINCT user_id) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'),
    (SELECT COUNT(*) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'),
    COALESCE((SELECT SUM(credits_cost)  FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'), 0),
    COALESCE((SELECT SUM(amount_fen)    FROM payment_orders WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day' AND status = 'paid'), 0),
    COALESCE((SELECT SUM(input_tokens)  FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'), 0),
    COALESCE((SELECT SUM(output_tokens) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'), 0),
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
    total_users             = EXCLUDED.total_users,
    active_users            = EXCLUDED.active_users,
    total_insights          = EXCLUDED.total_insights,
    total_credits_consumed  = EXCLUDED.total_credits_consumed,
    total_revenue_fen       = EXCLUDED.total_revenue_fen,
    total_input_tokens      = EXCLUDED.total_input_tokens,
    total_output_tokens     = EXCLUDED.total_output_tokens,
    lens_distribution       = EXCLUDED.lens_distribution,
    updated_at              = NOW();
END;
$$ LANGUAGE plpgsql;
