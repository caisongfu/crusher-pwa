-- =============================================
-- 索引优化
-- =============================================

-- Documents 索引
CREATE INDEX idx_documents_user_id ON documents(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_user_created ON documents(user_id, created_at DESC) WHERE is_deleted = FALSE;

-- Insights 索引
CREATE INDEX idx_insights_document_id ON insights(document_id);
CREATE INDEX idx_insights_user_id ON insights(user_id);
CREATE INDEX idx_insights_created_at ON insights(created_at DESC);

-- Credit Transactions 索引
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- Payment Orders 索引
CREATE INDEX idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX idx_payment_orders_out_trade_no ON payment_orders(out_trade_no);
CREATE INDEX idx_payment_orders_status ON payment_orders(status);
CREATE INDEX idx_payment_orders_created_at ON payment_orders(created_at DESC);

-- Custom Lenses 索引
CREATE INDEX idx_custom_lenses_user_id ON custom_lenses(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_custom_lenses_user_created ON custom_lenses(user_id, created_at DESC);

-- Feedbacks 索引
CREATE INDEX idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX idx_feedbacks_status ON feedbacks(status);
CREATE INDEX idx_feedbacks_type ON feedbacks(type);
CREATE INDEX idx_feedbacks_created_at ON feedbacks(created_at DESC);

-- System Prompts 索引
CREATE INDEX idx_system_prompts_lens_type ON system_prompts(lens_type);
CREATE INDEX idx_system_prompts_active ON system_prompts(lens_type, is_active) WHERE is_active = TRUE;

-- Announcements 索引
CREATE INDEX idx_announcements_active ON announcements(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_announcements_expires_at ON announcements(expires_at);
