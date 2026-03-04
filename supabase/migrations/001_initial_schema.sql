-- =============================================
-- Crusher · 碎石记 · 初始数据库架构
-- =============================================

-- =============================================
-- 用户扩展信息
-- =============================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT,
  role        TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  credits     INTEGER DEFAULT 0 CHECK (credits >= 0),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 自定义透镜（必须在 insights 之前创建）
-- =============================================
CREATE TABLE custom_lenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  icon          TEXT DEFAULT '🔧',
  description   TEXT,
  system_prompt TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 文档/原始内容
-- =============================================
CREATE TABLE documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT,
  raw_content  TEXT NOT NULL,
  char_count   INTEGER NOT NULL DEFAULT 0,
  source_type  TEXT DEFAULT 'text' CHECK (source_type IN ('text', 'voice')),
  is_deleted   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 支付订单（必须在 credit_transactions 之前创建）
-- =============================================
CREATE TABLE payment_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  out_trade_no    TEXT UNIQUE NOT NULL,
  platform_order  TEXT,
  package_name    TEXT NOT NULL,
  amount_fen      INTEGER NOT NULL,
  credits_granted INTEGER NOT NULL,
  payment_method  TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AI 分析结果
-- =============================================
CREATE TABLE insights (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lens_type      TEXT NOT NULL CHECK (lens_type IN ('requirements', 'meeting', 'review', 'risk', 'change', 'postmortem', 'tech', 'custom')),
  custom_lens_id UUID REFERENCES custom_lenses(id),
  result         TEXT NOT NULL,
  model          TEXT DEFAULT 'deepseek-chat',
  prompt_version TEXT DEFAULT 'v1',
  input_chars    INTEGER,
  input_tokens   INTEGER,
  output_tokens  INTEGER,
  credits_cost   INTEGER NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 积分交易流水（只增不改，审计用）
-- =============================================
CREATE TABLE credit_transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount             INTEGER NOT NULL,
  balance_after      INTEGER NOT NULL,
  type               TEXT NOT NULL CHECK (type IN ('payment', 'manual_grant', 'consumed', 'admin_deduct', 'refund')),
  description        TEXT,
  related_insight_id UUID REFERENCES insights(id),
  related_order_id   UUID REFERENCES payment_orders(id),
  operated_by        UUID REFERENCES profiles(id),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 用户反馈 / 投诉 / Bug 报告
-- =============================================
CREATE TABLE feedbacks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type               TEXT NOT NULL CHECK (type IN ('payment', 'bug', 'feature', 'other')),
  title              TEXT NOT NULL,
  content            TEXT NOT NULL,
  context_url        TEXT,
  related_order_id   UUID REFERENCES payment_orders(id),
  related_insight_id UUID REFERENCES insights(id),
  status             TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'resolved', 'closed')),
  admin_note         TEXT,
  handled_by         UUID REFERENCES profiles(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 系统 Prompt 版本管理
-- =============================================
CREATE TABLE system_prompts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_type     TEXT NOT NULL,
  version       TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT FALSE,
  notes         TEXT,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lens_type, version)
);

-- =============================================
-- 系统公告
-- =============================================
CREATE TABLE announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  type       TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'maintenance')),
  is_active  BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
