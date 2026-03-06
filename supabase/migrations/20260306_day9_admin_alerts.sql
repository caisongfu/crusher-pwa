-- supabase/migrations/20260306_day9_admin_alerts.sql

CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('error', 'warning', 'info')),
  level TEXT NOT NULL CHECK (level IN ('P0', 'P1', 'P2', 'P3')),
  message TEXT NOT NULL,
  details JSONB,
  user_id UUID REFERENCES profiles(id),
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_level ON admin_alerts(level);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_at ON admin_alerts(created_at DESC);
