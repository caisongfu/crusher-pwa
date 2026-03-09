-- 修复 update_daily_stats 函数中的类型转换问题
-- 问题：json_object_agg 返回 json，但 lens_distribution 字段是 jsonb
-- 解决：统一使用 jsonb_object_agg 或将 COALESCE 默认值改为 json

CREATE OR REPLACE FUNCTION update_daily_stats(p_date DATE DEFAULT CURRENT_DATE) RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_stats (
    date, total_users, new_users, active_users,
    total_insights, total_credits_consumed, total_revenue_fen,
    orders_count, total_input_tokens, total_output_tokens,
    lens_distribution
  )
  VALUES (
    p_date,
    (SELECT COUNT(*) FROM profiles WHERE created_at < p_date + INTERVAL '1 day'),
    (SELECT COUNT(*) FROM profiles WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'),
    (SELECT COUNT(DISTINCT user_id) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'),
    (SELECT COUNT(*) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'),
    COALESCE((SELECT SUM(credits_cost)  FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'), 0),
    COALESCE((SELECT SUM(amount_fen)    FROM payment_orders WHERE paid_at >= p_date AND paid_at < p_date + INTERVAL '1 day' AND status = 'paid'), 0),
    (SELECT COUNT(*) FROM payment_orders WHERE paid_at >= p_date AND paid_at < p_date + INTERVAL '1 day' AND status = 'paid'),
    COALESCE((SELECT SUM(input_tokens)  FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'), 0),
    COALESCE((SELECT SUM(output_tokens) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'), 0),
    COALESCE((
      SELECT jsonb_object_agg(lens_type, count)
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
    new_users               = EXCLUDED.new_users,
    active_users            = EXCLUDED.active_users,
    total_insights          = EXCLUDED.total_insights,
    total_credits_consumed  = EXCLUDED.total_credits_consumed,
    total_revenue_fen       = EXCLUDED.total_revenue_fen,
    orders_count            = EXCLUDED.orders_count,
    total_input_tokens      = EXCLUDED.total_input_tokens,
    total_output_tokens     = EXCLUDED.total_output_tokens,
    lens_distribution       = EXCLUDED.lens_distribution,
    updated_at              = NOW();
END;
$$ LANGUAGE plpgsql;
