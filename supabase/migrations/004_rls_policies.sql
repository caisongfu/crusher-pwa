-- =============================================
-- Row Level Security (RLS) 策略
-- =============================================

-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "admin_read_all_profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Documents RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_documents" ON documents
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_insert_documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insights RLS
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_insights" ON insights
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_insert_insights" ON insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Custom Lenses RLS
ALTER TABLE custom_lenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_lenses" ON custom_lenses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_insert_lenses" ON custom_lenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Credit Transactions RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_tx" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_manage_tx" ON credit_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Payment Orders RLS
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_orders" ON payment_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_manage_orders" ON payment_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Feedbacks RLS
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_feedbacks" ON feedbacks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_insert_feedback" ON feedbacks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_update_own_feedbacks" ON feedbacks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "admin_manage_feedbacks" ON feedbacks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- System Prompts RLS
ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_system_prompts" ON system_prompts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "public_read_active_prompts" ON system_prompts
  FOR SELECT USING (is_active = TRUE);

-- Announcements RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_announcements" ON announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "public_read_active_announcements" ON announcements
  FOR SELECT USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));
