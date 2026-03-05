# Crusher · 碎石记 · 产品设计全案

> 最后更新：2026-03-05 v4
> 状态：设计定稿，待开发
> 开发周期：9天（双端并重 + 完整版管理后台）

---

## 一、产品定位

| 项目 | 内容 |
|------|------|
| **产品名称** | Crusher（碎石记） |
| **Slogan** | 把碎片原石，碾成知识精矿 |
| **核心价值** | 捕捉原始内容（文字/语音）→ AI 一键结构化为专业文档 |
| **目标用户** | 软件研发公司团队成员（产品、开发、项目经理） |
| **核心场景** | 客户沟通记录 → 甲方需求文档；会议流水账 → 标准会议纪要 |
| **商业模式** | 购买积分制（按量付费，字符分级计费），支付方式可灵活切换 |
| **适配策略** | **双端并重**：PC 侧边栏布局为主，移动端底部导航为辅 |

---

## 二、核心功能模块

### 模块 A：极速输入

| 输入方式 | 实现方案 | 说明 |
|---------|---------|------|
| **文字输入** | `<textarea>` | 支持大段粘贴或手动输入，无长度硬限制（计费按字符数） |
| **🎙️ 语音输入** | **Web Speech API（浏览器原生）** | 按住麦克风按钮说话，文字实时出现在输入框，**零服务端处理，零 ASR 费用** |
| **标题（可选）** | 前端可选项 | 不填则提交后由 AI 自动生成摘要标题 |

> **语音输入兼容性**：iOS Safari 13+ ✅、Android Chrome ✅、Firefox ❌（提示使用键盘麦克风图标）
> **不存储任何音频文件**，无需 Supabase Storage，无需 ASR 服务。

### 模块 B：AI 文档透镜（核心功能）

#### 内置透镜（7个）

| 透镜 | 触发场景 | AI 输出格式 |
|------|---------|------------|
| **📋 甲方需求整理** | 客户沟通原始记录、邮件截图文字 | 背景 / 功能需求列表 / 验收标准 / 待确认事项 |
| **📝 会议纪要** | 会议录音转文字或流水账记录 | 会议主题 / 参与者 / 议题讨论结论 / 行动项（含负责人+截止日） |
| **🔍 需求评审** | 已有需求文档 | 歧义点 / 缺失信息 / 可行性风险 / 建议补充项 |
| **⚠️ 风险识别** | 项目描述或需求文档 | 技术风险 / 排期风险 / 外部依赖风险 / 缓解建议 |
| **📊 变更影响分析** | 需求变更描述 | 影响范围 / 工作量预估（T恤尺码） / 建议决策 |
| **🐛 问题复盘** | Bug 描述或故障记录 | 根因分析 / 改进措施 / 预防机制（5Why 格式） |
| **📖 技术决策记录** | 技术讨论原文 | ADR 格式：背景 / 决策 / 理由 / 影响 |

#### 自定义透镜（用户创建）

- 用户可新建自定义透镜：填写名称 + Emoji 图标 + System Prompt
- 积分消耗固定 10 积分/次（同内置透镜基础档）
- 与内置透镜并列展示，可编辑/删除
- 仅自己可见（v2 再做透镜市场和分享）

### 模块 C：AI 结果展示与复制

每次 AI 分析完成后，结果卡片底部提供**三种复制格式**（必须功能）：

| 按钮 | 格式 | 适用场景 |
|------|------|---------|
| `📋 复制 Markdown` | 原始 Markdown 字符串 | Notion / 飞书 / 语雀 / 掘金 |
| `📄 复制纯文本` | 去除所有 Markdown 标记的纯文字 | 微信 / 钉钉 / 邮件正文 |
| `✨ 复制富文本` | HTML 渲染后的格式化内容 | Word / 企业微信 / 带格式的编辑器 |

> PDF / Word 导出 → **v2 迭代功能**，MVP 不做。

### 模块 D：文档管理

- 文档列表，按时间倒序，支持全文搜索（标题 + 内容）
- 每条文档展示：标题 + 原始内容摘要 + 已使用的透镜标签
- 文档详情页：原文 + 所有 AI 分析结果（Markdown 渲染）
- 软删除（is_deleted 标记，数据可恢复）

### 模块 E：积分与支付系统

**设计原则：支付方式与业务逻辑解耦**

```
┌─────────────────────────────────────────────────┐
│  业务层（订单 + 积分）                            │
│  ↓ 通过统一接口调用                              │
│  支付抽象层（PaymentProvider Interface）         │
│  ↓ 具体实现可随时切换                            │
│  [虎皮椒] [支付宝官方] [PayPal] [手动转账]        │
└─────────────────────────────────────────────────┘
```

**用户侧：**
- 实时查看当前积分余额（顶部导航栏常驻显示）
- 输入框实时显示当前字数 + **动态预览本次消耗积分数**
- 消费明细记录（每次分析的积分扣减记录）
- **充值入口（MVP 阶段保留 UI，暂不可用）**
  - 显示套餐选择界面
  - 点击后提示："支付功能开发中，如需充值请联系管理员"
  - 提供 PayPal 收款地址：PayPal.Me/SoulfulCai（用户手动转账后联系管理员）

**支付流程（架构设计，MVP 暂不实现）：**
```
用户点击"购买积分" → 选择套餐
    ↓
【支付抽象层】根据配置选择支付渠道
    ↓
├─ 虎皮椒：跳转支付页 → Webhook 回调 → 自动充积分
├─ 支付宝官方：生成订单 → 异步通知 → 自动充积分
├─ PayPal：显示收款链接 → 用户手动转账 → 管理员手动充值
└─ 手动转账：显示银行账号 → 用户转账 → 管理员核对后充值
    ↓
订单状态更新（pending → paid）
    ↓
积分到账（数据库事务）
    ↓
用户收到通知（页面 toast 提示）
```

**MVP 阶段实现方案：**
- ✅ 积分系统完整实现（扣减、查询、流水记录）
- ✅ 订单表结构完整（支持多种支付方式）
- ✅ 管理员手动充值功能（用于 PayPal 转账后补积分）
- ⏸️ 自动支付接口暂不实现（保留代码接口，返回"功能开发中"）
- 📋 后续切换支付方式时，只需实现对应 Provider，无需改动订单和积分逻辑

**管理员后台：**
- 用户列表（搜索、筛选、积分余额查看）
- **手动充值/扣减积分（MVP 核心功能，用于 PayPal 转账后补积分、退款、补偿、测试）**
- 全平台积分交易流水
- 用量统计（每日 AI 调用次数、积分消耗趋势）
- 支付订单列表（记录所有充值请求，含支付方式字段）
- **用户反馈列表（投诉/Bug/建议）+ 状态处理 + 管理员回复**

### 模块 F：用户反馈系统

**四个触发入口，统一到同一张表单：**

| 入口 | 位置 | 自动预填内容 |
|------|------|------------|
| 主入口 | Profile 页"我的反馈" Tab | 无预填 |
| 支付兜底 | 积分流水中状态异常订单行右侧小字 | 类型=支付问题，自动关联订单号 |
| Bug 快报 | 每页右下角浮动 `?` 按钮 | 类型=Bug，自动附带当前页面 URL |
| AI 内容投诉 | Insight 结果卡右上角 `···` 菜单 | 类型=内容问题，关联 insight_id |

**反馈表单字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| 类型（必选） | 单选 | 💳 支付问题 / 🐛 Bug 报告 / 💡 功能建议 / 📝 其他 |
| 标题（必填） | 文本 | 一句话描述，最多 100 字 |
| 详情（必填） | 多行文本 | 具体描述，最多 2,000 字 |
| 关联信息 | 只读自动填充 | 订单号 / 页面 URL / Insight ID（根据入口携带） |

**用户在 Profile → 我的反馈 可查看所有提交记录及状态：**

| 状态 | 说明 | 用户是否可见管理员回复 |
|------|------|-------------------|
| ⏳ 待处理 | 已收到，排队中 | — |
| 🔄 处理中 | 管理员正在跟进 | — |
| ✅ 已解决 | 问题已处理 | ✅ 显示管理员回复 |
| 🚫 已关闭 | 不予处理 | ✅ 显示关闭原因 |

---

## 三、积分分级计费模型

### 计费规则

| 档位 | 字符数范围 | 积分费用 | 场景示例 |
|------|-----------|---------|---------|
| 基础 | 0 ~ 3,000 字 | **10 积分** | 一段会议记录 |
| 标准 | 3,001 ~ 6,000 字 | **15 积分** | 一份需求文档 |
| 扩展 | 6,001 ~ 10,000 字 | **22 积分** | 多轮沟通记录 |
| 超长 | 每增加 1,000 字 | **+5 积分** | 大型项目文档 |
| 硬性上限 | 50,000 字 | 超出截断 | 约 20 页 Word |

**前端实时预览：**
```
当前字数：4,230 字  |  本次消耗：15 积分  |  剩余余额：85 积分
```

### 套餐定价

| 套餐 | 积分数 | 售价 | 单价 | 折扣 |
|------|--------|------|------|------|
| 入门包 | 100 | ¥10 | ¥0.10/积分 | - |
| 标准包 | 500 | ¥45 | ¥0.09/积分 | 9折 |
| 专业包 | 1200 | ¥96 | ¥0.08/积分 | 8折 |

**成本利润分析：**

| 档位 | DeepSeek 实际成本 | 售价 | 利润率 |
|------|-----------------|------|--------|
| 基础（3000字以内） | ≈ ¥0.015 | ¥1.0 | **66x** |
| 标准（6000字以内） | ≈ ¥0.03 | ¥1.5 | **50x** |
| 超长（10000字） | ≈ ¥0.05 | ¥2.2 | **44x** |

> 全档位健康盈利，无亏本风险。与 GPT 价格体系持平，用户无感知差异。

---

## 四、技术架构

### 整体架构

```
┌───────────────────────────────────────────────────────────┐
│                 用户浏览器 / PWA                            │
│   Next.js 15 (App Router) + Tailwind CSS + Shadcn/UI      │
│                                                           │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ 认证页面  │  │ 主应用页面   │  │ 管理员后台            │  │
│  └──────────┘  └─────────────┘  └──────────────────────┘  │
│                                                           │
│  [Web Speech API] ← 浏览器原生语音识别，无需服务端           │
└────────────────────────────┬──────────────────────────────┘
                             │ HTTPS (TLS 1.3)
                   ┌─────────▼──────────┐
                   │   Vercel Edge      │
                   │  ┌──────────────┐  │
                   │  │  Middleware   │  │  ← JWT 校验 + Admin 鉴权
                   │  │  Rate Limit  │  │  ← Upstash Redis 限流
                   │  └──────────────┘  │
                   │  ┌──────────────┐  │
                   │  │  API Routes  │  │  ← 业务逻辑 + 积分扣减
                   │  └──────┬───────┘  │
                   └─────────┼──────────┘
          ┌──────────────────┼──────────────────────────────┐
          │                  │                              │
 ┌────────▼──────┐  ┌────────▼───────┐  ┌──────────────────▼─────────┐
 │  Supabase     │  │  DeepSeek API  │  │  支付抽象层（可插拔）        │
 │  PostgreSQL   │  │  deepseek-chat │  │  ┌──────────────────────┐  │
 │  Auth (JWT)   │  │  (流式输出)    │  │  │ PaymentProvider 接口  │  │
 └───────────────┘  └────────────────┘  │  └──────────────────────┘  │
                                        │  ├─ 虎皮椒（待接入）       │
                                        │  ├─ 支付宝官方（待接入）   │
                                        │  ├─ PayPal（手动）        │
                                        │  └─ 手动转账（管理员充值） │
                                        └────────────────────────────┘
```

### 技术选型（最终版）

| 层次 | 技术 | 选型理由 |
|------|------|---------|
| 框架 | Next.js 15 App Router | 全栈一体，Vercel 零配置部署 |
| 语言 | TypeScript | 全栈类型安全 |
| 样式 | Tailwind CSS + Shadcn/UI | 开发最快，组件质量高 |
| 图标 | Lucide React | 与 Shadcn 风格统一 |
| 动画 | Framer Motion | 卡片进场、流式加载动效 |
| Markdown | react-markdown + rehype-highlight | 渲染 AI 输出，代码高亮 |
| 表单 | React Hook Form + Zod | 类型安全的表单校验 |
| 状态 | Zustand | 轻量全局状态 |
| 数据库 | Supabase (PostgreSQL) | Auth + DB 一体，RLS 行级权限 |
| LLM | DeepSeek API (deepseek-chat) | 国内直连，成本极低 |
| AI SDK | Vercel AI SDK | 流式输出几行代码搞定 |
| 语音 | **Web Speech API（浏览器原生）** | 零成本，零服务端，iOS/Android 支持 |
| 支付 | **支付抽象层（可插拔设计）** | 支持多种支付方式，MVP 阶段手动充值 + PayPal |
| 限流 | Upstash Redis | 无服务器 Redis，Vercel Edge 兼容 |
| PWA | @ducanh2912/next-pwa | 配置简单，可安装到桌面 |
| 复制 | Clipboard API + ClipboardItem | 支持 HTML/纯文本/Markdown 三种格式 |

---

## 五、数据库设计（最终版）

```sql
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
-- 文档/原始内容
-- =============================================
CREATE TABLE documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT,
  raw_content  TEXT NOT NULL,
  char_count   INTEGER NOT NULL DEFAULT 0,   -- 提交时计算，用于账单核对
  source_type  TEXT DEFAULT 'text' CHECK (source_type IN ('text', 'voice')),
  is_deleted   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AI 分析结果
-- =============================================
CREATE TABLE insights (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lens_type      TEXT NOT NULL,   -- 'requirements'|'meeting'|'review'|'risk'|'change'|'postmortem'|'tech'|'custom'
  custom_lens_id UUID REFERENCES custom_lenses(id),   -- 自定义透镜时关联
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
-- 自定义透镜
-- =============================================
CREATE TABLE custom_lenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  icon          TEXT DEFAULT '🔧',   -- Emoji 图标
  description   TEXT,
  system_prompt TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 积分交易流水（只增不改，审计用）
-- =============================================
CREATE TABLE credit_transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount             INTEGER NOT NULL,          -- 正数=充值，负数=消耗
  balance_after      INTEGER NOT NULL,          -- 交易后余额（冗余，便于对账）
  type               TEXT NOT NULL CHECK (type IN ('payment', 'manual_grant', 'consumed', 'admin_deduct', 'refund')),
  description        TEXT,
  related_insight_id UUID REFERENCES insights(id),
  related_order_id   UUID REFERENCES payment_orders(id),
  operated_by        UUID REFERENCES profiles(id),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 支付订单（支持多种支付方式）
-- =============================================
CREATE TABLE payment_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  out_trade_no    TEXT UNIQUE NOT NULL,    -- 我方生成的订单号
  platform_order  TEXT,                   -- 第三方平台订单号（如虎皮椒、支付宝）
  package_name    TEXT NOT NULL,          -- '入门包'|'标准包'|'专业包'
  amount_fen      INTEGER NOT NULL,        -- 支付金额（分）
  credits_granted INTEGER NOT NULL,        -- 应充积分数
  payment_provider TEXT NOT NULL,         -- 'hupijiao'|'alipay_official'|'paypal'|'manual'
  payment_method  TEXT,                   -- 'wxpay'|'alipay'|'paypal'|'bank_transfer'
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at         TIMESTAMPTZ,
  admin_note      TEXT,                   -- 管理员备注（手动充值时填写）
  created_at      TIMESTAMPTZ DEFAULT NOW()
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
  context_url        TEXT,                            -- 提交时的页面 URL（Bug 定位用）
  related_order_id   UUID REFERENCES payment_orders(id),
  related_insight_id UUID REFERENCES insights(id),
  status             TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'resolved', 'closed')),
  admin_note         TEXT,                            -- 管理员回复/备注（用户可见）
  handled_by         UUID REFERENCES profiles(id),   -- 处理人
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

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

-- =============================================
-- 索引优化
-- =============================================
CREATE INDEX idx_documents_user_id ON documents(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_insights_document_id ON insights(document_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX idx_payment_orders_out_trade_no ON payment_orders(out_trade_no);
CREATE INDEX idx_custom_lenses_user_id ON custom_lenses(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX idx_feedbacks_status ON feedbacks(status);
CREATE INDEX idx_feedbacks_type ON feedbacks(type);
```

### Row Level Security (RLS)

```sql
-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "admin_read_all_profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_documents" ON documents FOR ALL USING (auth.uid() = user_id);

-- insights
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_insights" ON insights FOR ALL USING (auth.uid() = user_id);

-- custom_lenses
ALTER TABLE custom_lenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_lenses" ON custom_lenses FOR ALL USING (auth.uid() = user_id);

-- credit_transactions（用户只读，管理员可写）
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_read_own_tx" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_manage_tx" ON credit_transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- payment_orders
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_read_own_orders" ON payment_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_manage_orders" ON payment_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- feedbacks
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_read_own_feedbacks" ON feedbacks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_feedback" ON feedbacks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_manage_feedbacks" ON feedbacks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

---

## 六、项目目录结构

```
crusher/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (main)/
│   │   │   ├── layout.tsx              # 主布局（顶部导航 + 积分余额显示）
│   │   │   ├── page.tsx                # 首页（文档列表）
│   │   │   ├── capture/page.tsx        # 新建文档（输入页 + 语音 + 积分预览）
│   │   │   ├── documents/
│   │   │   │   └── [id]/page.tsx       # 文档详情 + 透镜选择 + 结果 + 复制按钮
│   │   │   ├── lenses/page.tsx         # 自定义透镜管理页
│   │   │   └── profile/page.tsx        # 个人资料 + 积分 + 消费记录 + 充值入口
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                # 用户列表
│   │   │   ├── users/[id]/page.tsx     # 用户详情 + 手动积分操作
│   │   │   ├── orders/page.tsx         # 支付订单列表
│   │   │   ├── feedbacks/page.tsx      # 反馈/投诉/Bug 列表（含筛选）
│   │   │   ├── feedbacks/[id]/         # 反馈详情（侧抽屉模式，可用 intercepting route）
│   │   │   └── stats/page.tsx          # 用量统计（含反馈趋势）
│   │   └── api/
│   │       ├── insights/route.ts       # POST: AI 分析（积分检查+扣减+流式输出）
│   │       ├── feedbacks/route.ts      # POST: 用户提交反馈; GET: 用户自己的反馈列表
│   │       ├── payment/
│   │       │   ├── create/route.ts     # POST: 创建支付订单（MVP 返回"功能开发中"）
│   │       │   └── webhook/route.ts    # POST: 支付回调接口（预留，支持多 Provider）
│   │       └── admin/
│   │           ├── users/route.ts
│   │           ├── credits/route.ts    # POST: 管理员手动充值/扣减（MVP 核心功能）
│   │           └── feedbacks/
│   │               ├── route.ts        # GET: 管理员查询反馈列表（含筛选/分页）
│   │               └── [id]/route.ts   # PATCH: 更新状态 + 写入管理员回复
│   ├── components/
│   │   ├── ui/                         # Shadcn 基础组件
│   │   ├── capture-form.tsx            # 文档输入 + 字数/积分实时预览
│   │   ├── voice-button.tsx            # Web Speech API 语音按钮
│   │   ├── document-card.tsx           # 文档列表卡片
│   │   ├── lens-selector.tsx           # 内置 + 自定义透镜选择器
│   │   ├── insight-result.tsx          # AI 流式结果 + 三格式复制按钮
│   │   ├── copy-buttons.tsx            # 复制 Markdown / 纯文本 / 富文本
│   │   ├── credit-badge.tsx            # 顶部积分余额徽章
│   │   ├── lens-form.tsx               # 自定义透镜创建/编辑表单
│   │   └── feedback-form.tsx           # 反馈提交表单（类型选择 + 关联信息自动填充）
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── deepseek.ts                 # DeepSeek API 封装
│   │   ├── credits.ts                  # 积分计算 + 原子扣减 RPC 调用
│   │   ├── payment/                    # 支付抽象层（可插拔设计）
│   │   │   ├── types.ts                # PaymentProvider 接口定义
│   │   │   ├── providers/
│   │   │   │   ├── hupijiao.ts         # 虎皮椒实现（待接入）
│   │   │   │   ├── alipay.ts           # 支付宝官方实现（待接入）
│   │   │   │   ├── paypal.ts           # PayPal 实现（手动模式）
│   │   │   │   └── manual.ts           # 手动转账（管理员充值）
│   │   │   └── index.ts                # Provider 工厂函数
│   │   ├── copy.ts                     # 三格式复制工具函数
│   │   ├── rate-limit.ts               # Upstash 限流
│   │   └── prompts/                    # 所有 System Prompt
│   │       ├── index.ts                # 透镜注册表（内置+自定义统一入口）
│   │       ├── requirements.ts
│   │       ├── meeting.ts
│   │       ├── review.ts
│   │       ├── risk.ts
│   │       ├── change.ts
│   │       ├── postmortem.ts
│   │       └── tech.ts
│   ├── middleware.ts                   # JWT 校验 + Admin 鉴权 + 限流
│   └── types/
│       └── index.ts
├── public/
│   ├── manifest.json                   # PWA 配置
│   └── icons/
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       ├── 003_deduct_credits_fn.sql
│       └── 004_feedbacks.sql
└── next.config.ts
```

---

## 七、安全架构

### 7.1 前端安全

| 措施 | 说明 |
|------|------|
| 代码混淆 | Next.js 生产构建自动压缩混淆，业务逻辑无法还原 |
| 零 API Key | 所有密钥仅在服务端 env，前端 bundle 中永不出现 |
| PWA 缓存安全 | Service Worker 只缓存静态资源，**不缓存任何 API 响应** |
| XSS 防护 | CSP Header + AI 输出内容只走 react-markdown 渲染，不用 dangerouslySetInnerHTML |
| 语音安全 | Web Speech API 由浏览器处理，我方无法访问原始音频 |

### 7.2 API 安全

```
每个请求的 Middleware 处理链：
1. 解析 JWT → 验证用户身份
2. /admin/* → 额外验证 role = 'admin'
3. /api/insights → Upstash 限流（每用户 20次/分钟）
4. /api/payment/webhook → 验证虎皮椒签名（防伪造回调）
5. 入参 Zod 校验 → 类型安全 + 长度限制
```

### 7.3 业务安全

| 风险 | 防护措施 |
|------|---------|
| 积分并发超扣 | PostgreSQL 行锁事务（`FOR UPDATE`），100% 安全 |
| 支付回调伪造 | 验证第三方平台签名（如虎皮椒 HMAC、支付宝 RSA），幂等处理 |
| 超长输入攻击 | 前后端双重限制 50,000 字，超出返回 400 |
| 音频上传攻击 | 已移除，Web Speech API 无此风险 |
| SQL 注入 | 全程 Supabase Client 参数化查询 |

### 7.4 安全 Headers（next.config.ts）

```typescript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'microphone=(self)' },  // 只允许自身使用麦克风
  { key: 'Content-Security-Policy', value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://*.supabase.co https://api.deepseek.com",
  ].join('; ') },
]
```

---

## 八、关键功能实现说明

### 8.1 Web Speech API 语音输入

```typescript
// components/voice-button.tsx
export function VoiceButton({ onResult }: { onResult: (text: string) => void }) {
  const [isListening, setIsListening] = useState(false)

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('您的浏览器不支持语音输入，请使用键盘麦克风图标')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = true   // 实时显示中间结果

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('')
      onResult(transcript)
    }
    recognition.start()
    setIsListening(true)
  }
  // ...
}
```

### 8.2 分级积分计算

```typescript
// lib/credits.ts
export function calculateCreditCost(charCount: number): number {
  if (charCount <= 3000) return 10
  if (charCount <= 6000) return 15
  if (charCount <= 10000) return 22
  return 22 + Math.ceil((charCount - 10000) / 1000) * 5
}
```

### 8.3 三格式复制

```typescript
// lib/copy.ts
export async function copyAsRichText(markdown: string) {
  const html = await markdownToHtml(markdown)    // 用 marked 转 HTML
  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([stripMarkdown(markdown)], { type: 'text/plain' }),
    })
  ])
}

export async function copyAsPlainText(markdown: string) {
  await navigator.clipboard.writeText(stripMarkdown(markdown))
}

export async function copyAsMarkdown(markdown: string) {
  await navigator.clipboard.writeText(markdown)
}
```

### 8.4 支付抽象层设计

```typescript
// lib/payment/types.ts
export interface PaymentProvider {
  name: string
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>
  verifyCallback(body: string, signature: string): boolean
  parseCallback(body: string): CallbackData
}

export interface CreateOrderParams {
  userId: string
  packageName: string
  amountFen: number
  creditsGranted: number
}

export interface CreateOrderResult {
  orderId: string
  paymentUrl?: string      // 自动支付时返回
  instructions?: string    // 手动支付时返回说明
}

// lib/payment/providers/manual.ts
export class ManualPaymentProvider implements PaymentProvider {
  name = 'manual'

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const orderId = await saveOrder({ ...params, provider: 'manual' })
    return {
      orderId,
      instructions: `请通过以下方式支付：
        PayPal: PayPal.Me/SoulfulCai
        金额: ¥${params.amountFen / 100}
        备注: ${orderId}

        支付完成后请联系管理员充值积分`
    }
  }

  verifyCallback() { return true }  // 手动模式无回调
  parseCallback() { throw new Error('Manual mode has no callback') }
}

// lib/payment/providers/hupijiao.ts（预留接口）
export class HupijiaoProvider implements PaymentProvider {
  name = 'hupijiao'

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    // TODO: 接入虎皮椒 API
    throw new Error('Hupijiao provider not implemented yet')
  }

  verifyCallback(body: string, signature: string): boolean {
    // TODO: 验证虎皮椒签名
    return false
  }

  parseCallback(body: string): CallbackData {
    // TODO: 解析虎皮椒回调
    throw new Error('Not implemented')
  }
}

// lib/payment/index.ts
export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER || 'manual'

  switch (provider) {
    case 'manual':
      return new ManualPaymentProvider()
    case 'hupijiao':
      return new HupijiaoProvider()
    case 'alipay':
      return new AlipayProvider()
    case 'paypal':
      return new PayPalProvider()
    default:
      return new ManualPaymentProvider()
  }
}
```

### 8.5 支付 API 实现（MVP 版本）

```typescript
// api/payment/create/route.ts
export async function POST(req: Request) {
  const { packageName } = await req.json()
  const user = await getServerUser()

  const packages = {
    '入门包': { credits: 100, price: 1000 },
    '标准包': { credits: 500, price: 4500 },
    '专业包': { credits: 1200, price: 9600 },
  }

  const pkg = packages[packageName]
  if (!pkg) return new Response('Invalid package', { status: 400 })

  // 使用支付抽象层
  const provider = getPaymentProvider()
  const result = await provider.createOrder({
    userId: user.id,
    packageName,
    amountFen: pkg.price,
    creditsGranted: pkg.credits,
  })

  return Response.json({
    orderId: result.orderId,
    paymentUrl: result.paymentUrl,
    instructions: result.instructions,
    provider: provider.name,
  })
}

// api/payment/webhook/route.ts（预留接口）
export async function POST(req: Request) {
  const provider = getPaymentProvider()
  const body = await req.text()
  const signature = req.headers.get('x-signature') || ''

  // 验证签名
  if (!provider.verifyCallback(body, signature)) {
    return new Response('Invalid signature', { status: 403 })
  }

  // 解析回调数据
  const { orderId, status } = provider.parseCallback(body)
  if (status !== 'paid') return new Response('ok')

  // 幂等检查
  const order = await getOrderById(orderId)
  if (order.status === 'paid') return new Response('ok')

  // 充值积分（数据库事务）
  await grantCreditsFromPayment(order.user_id, order.credits_granted, order.id)

  return new Response('success')
}
```

### 8.6 DeepSeek 流式输出

```typescript
// api/insights/route.ts
export async function POST(req: Request) {
  const { documentId, lensType } = InsightRequestSchema.parse(await req.json())
  const user = await getServerUser()

  // 查文档内容
  const doc = await getDocument(documentId, user.id)
  const cost = calculateCreditCost(doc.char_count)

  // 检查并预扣积分（数据库事务）
  const deductResult = await deductCredits(user.id, cost, `${lensType} 分析`)
  if (!deductResult.success) return new Response('积分不足', { status: 402 })

  // 获取 Prompt（内置或自定义）
  const prompt = await resolvePrompt(lensType, user.id)

  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: prompt.system,
    prompt: prompt.userTemplate.replace('{content}', doc.raw_content),
    maxTokens: 2000,
    onFinish: async ({ usage }) => {
      // 异步保存结果 + 记录 token 用量
      await saveInsight({ documentId, lensType, result: '...', ...usage, creditsCost: cost })
    },
  })

  return result.toDataStreamResponse()
}
```

---

## 九、双端布局设计规格

### PC 端（≥768px）—— 侧边栏布局

```
┌─────────────────────────────────────────────────────────┐
│  🪨 Crusher                          [积分: 85] [头像▼] │  ← 顶部栏（高度 56px）
├──────────────┬──────────────────────────────────────────┤
│  侧边栏       │  主内容区                                 │
│  (240px)     │                                          │
│              │  [文档标题输入框]                          │
│  📄 文档列表  │                                          │
│  ─────────   │  ┌────────────────────────────────────┐  │
│  📝 今日纪要  │  │  原始内容输入区（min-height: 200px）│  │
│  📋 甲方需求  │  │  🎙️ 语音  |  1,234字 | 预消耗 15积分│  │
│  ⚠️ 风险识别  │  └────────────────────────────────────┘  │
│  ...         │                                          │
│              │  选择透镜：                               │
│  ─────────   │  [📋需求] [📝纪要] [🔍评审] [⚠️风险]...   │
│  ✨ 自定义    │                                          │
│  透镜管理    │  ─── AI 分析结果 ──────────────────────── │
│              │                                          │
│  ─────────   │  [Markdown 渲染区（流式打字机效果）]       │
│  ⚙️ 设置     │                                          │
│  💳 充值积分  │  [📋 Markdown] [📄 纯文本] [✨ 富文本]    │
└──────────────┴──────────────────────────────────────────┘
```

### 移动端（<768px）—— 底部导航布局

```
┌────────────────────────┐
│ 🪨 Crusher  [积分: 85] │  ← 顶部栏（高度 48px）
├────────────────────────┤
│                        │
│  [文档标题（可选）]      │
│                        │
│  ┌──────────────────┐  │
│  │  原始内容输入区   │  │
│  │  (min-h: 160px)  │  │
│  │  🎙️ | 字数 | 积分 │  │
│  └──────────────────┘  │
│                        │
│  透镜（横向滚动）：      │
│  ◀ [📋] [📝] [🔍] ▶   │
│                        │
│  ─ AI 分析结果 ──────── │
│  [流式 Markdown 渲染]   │
│                        │
│  [📋] [📄] [✨]        │
│                        │
├────────────────────────┤
│  🏠首页  📄文档  👤我的  │  ← 底部导航（高度 56px）
└────────────────────────┘
```

### 布局实现策略

```typescript
// 用 Tailwind 响应式类，同一组件树，无重复代码
// 侧边栏：PC 显示，移动端隐藏
<aside className="hidden md:flex md:w-60 md:flex-col ...">

// 底部导航：移动端显示，PC 隐藏
<nav className="flex md:hidden fixed bottom-0 ...">

// 内容区：移动端全宽，PC 端减去侧边栏
<main className="flex-1 md:ml-60 p-4 md:p-8">
```

---

## 十、完整版管理后台设计

### 新增数据库表

```sql
-- =============================================
-- 系统 Prompt 版本管理（数据库驱动，无需重部署）
-- =============================================
CREATE TABLE system_prompts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_type    TEXT NOT NULL,              -- 对应内置透镜类型
  version      TEXT NOT NULL,             -- 'v1', 'v2', ...
  system_prompt TEXT NOT NULL,
  is_active    BOOLEAN DEFAULT FALSE,      -- 每个 lens_type 只有一个 active
  notes        TEXT,                       -- 管理员变更说明
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lens_type, version)
);

-- 初始化内置 Prompt 到数据库（由迁移脚本插入）

-- =============================================
-- 系统公告
-- =============================================
CREATE TABLE announcements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,             -- Markdown
  type         TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'maintenance')),
  is_active    BOOLEAN DEFAULT TRUE,
  expires_at   TIMESTAMPTZ,               -- NULL = 永不过期
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### 管理后台页面规格

#### 1. 用户管理 `/admin`

| 列 | 内容 |
|----|------|
| 用户 | 头像 + 邮箱 + 注册时间 |
| 积分余额 | 当前积分数，可点击直接充值 |
| 状态 | 正常 / 已禁用 + 切换按钮 |
| 操作 | 查看详情 / 手动调整积分 |

功能：搜索框（邮箱模糊搜索）、分页（每页 20 条）

#### 2. 积分管理 `/admin/users/[id]`

- 用户基本信息
- 积分余额 + 充值/扣减表单（含备注必填）
- 该用户完整积分流水（时间倒序）

#### 3. 支付订单 `/admin/orders`

| 列 | 内容 |
|----|------|
| 订单号 | out_trade_no |
| 用户 | 邮箱 |
| 套餐 | 入门/标准/专业包 |
| 金额 | ¥xx |
| 状态 | 待支付 / 已完成 / 已退款 |
| 时间 | 支付时间 |

#### 4. 用量统计 `/admin/stats`

使用 **Recharts** 渲染：

```
┌─────────────────────────────────────────┐
│  每日 AI 调用量（折线图，最近 30 天）      │
│                                         │
│  ╭──╮                                   │
│  │  ╰──╮   ╭──╮                         │
│ ─┴─────╰───╯  ╰────────────────         │
└─────────────────────────────────────────┘

┌──────────────┐  ┌──────────────────────┐
│ 透镜使用分布  │  │ 积分消耗趋势（柱状图） │
│ （饼图）      │  │                      │
│   📋 38%    │  │  ██                  │
│   📝 29%    │  │  ██ ██               │
│   🔍 18%    │  │  ██ ██ ██            │
│   其他 15%  │  │  ── ── ── ──         │
└──────────────┘  └──────────────────────┘
```

#### 5. Prompt 版本管理 `/admin/prompts`

```
透镜：[📋 甲方需求整理 ▼]

当前激活版本：v2（2026-03-05 更新）
变更说明：优化了验收标准的提取逻辑

┌─ Prompt 编辑器（Monaco Editor 或 Textarea）──────┐
│  你是一位专业的需求分析师...                       │
│                                                   │
└───────────────────────────────────────────────────┘

[预览效果（输入测试文本 → 查看 AI 输出）]  [发布为新版本]

版本历史：
v2  2026-03-05  优化验收标准提取   [激活中]
v1  2026-03-04  初始版本           [查看]
```

> **实现方式**：API 调用时先从 `system_prompts` 表查询 `is_active=true` 的版本，无需改代码即可更新 Prompt。

#### 6. 系统公告 `/admin/announcements`

- 公告列表（标题 / 类型 / 状态 / 到期时间）
- 新建/编辑公告（Markdown 编辑 + 预览）
- 前端首页顶部显示活跃公告（橙色/红色横幅）

#### 7. 反馈管理 `/admin/feedbacks`

**反馈列表**（三级筛选：类型 × 状态 × 时间范围）：

| 列 | 内容 |
|----|------|
| 类型 | 💳 支付 / 🐛 Bug / 💡 建议 / 📝 其他 |
| 标题 | 点击展开详情侧抽屉 |
| 用户 | 邮箱（可跳转用户详情页） |
| 关联 | 订单号 / 页面 URL（可点击） |
| 状态 | ⏳ 待处理 / 🔄 处理中 / ✅ 已解决 / 🚫 已关闭 |
| 时间 | 提交时间 |

**详情侧抽屉**（点击任意行弹出，无需跳转新页面）：

```
┌─────────────────────────────────────────┐
│  💳 支付问题  ⏳ 待处理           [×]  │
│  ─────────────────────────────────────  │
│  用户：zhang@example.com               │
│  时间：2026-03-05 14:23                 │
│                                         │
│  标题：支付成功但积分未到账              │
│  详情：昨天下午购买了标准包，            │
│        支付宝显示扣款成功，             │
│        但积分余额没有变化...            │
│                                         │
│  关联订单：ORD-20260305-001  [查看订单] │
│  ─────────────────────────────────────  │
│  管理员回复（用户可见）：               │
│  ┌────────────────────────────────────┐ │
│  │ 已核查 Webhook 日志，手动补积分...  │ │
│  └────────────────────────────────────┘ │
│                                         │
│  状态：[⏳ 待处理 ▼]  [保存并回复用户]  │
└─────────────────────────────────────────┘
```

**快捷联动操作**：
- 若关联了 `related_order_id`，侧抽屉底部直接显示订单状态和支付金额，并提供"一键跳转补发积分"按钮
- 批量操作：勾选多条 → 批量标记已解决

**反馈数据纳入统计看板** `/admin/stats`（新增模块）：

```
┌──────────────────────────────────────────┐
│  本周新增反馈：12 条  待处理：3 条        │
│  ──────────────────────────────────────  │
│  💳 支付问题  3   ████                   │
│  🐛 Bug 报告  5   ██████                 │
│  💡 功能建议  4   █████                  │
└──────────────────────────────────────────┘
```

---

## 十一、9 天开发路线图（最终版）

| 天 | 阶段 | 核心任务 | 验收标准 |
|----|------|---------|---------|
| **Day 1** | 基础设施 | Next.js 15 初始化 + Supabase 完整建表（新增 system_prompts / announcements）+ Auth + Middleware | 可注册登录，数据库就绪 |
| **Day 2** | 双端布局 | PC 侧边栏 + 移动端底部导航 + 共享组件库（Card/Button/Badge 等）+ 路由骨架 | PC/移动端布局切换正常 |
| **Day 3** | 核心 CRUD | 文档输入页（字数/积分实时预览）+ 文档列表 + 文档详情 + 软删除 | 能写/读/列出/删除文档 |
| **Day 4** | AI 核心 | DeepSeek 流式输出 + 7个内置透镜（从 DB 读 Prompt）+ 积分扣减 + 语音输入（Web Speech API） | 流式 AI 输出正常，积分正确 |
| **Day 5** | 复制 + 支付架构 | 三格式复制 + 支付抽象层设计 + 充值 UI（暂不可用）+ 积分余额展示 + 管理员手动充值功能 | 复制功能正常，管理员可手动充值 |
| **Day 6** | 自定义透镜 + 反馈系统 + 公告 | 自定义透镜 CRUD + 反馈提交表单（含四个触发入口）+ 前端公告横幅展示 | 用户可创建透镜，可提交反馈，公告可显示 |
| **Day 7** | 管理后台 基础 | 用户列表 + 禁用/启用 + 手动积分 + 订单列表 + 用量统计图表 | 管理员核心操作全通 |
| **Day 8** | 管理后台 进阶 + 安全 | Prompt 版本管理 + 公告管理 + **反馈管理（列表+侧抽屉+状态处理）** + 安全 Headers + Upstash 限流 + PWA 配置 | 管理员可在线更新 Prompt，可处理用户反馈 |
| **Day 9** | 上线 | 生产部署 + 域名 + 环境变量 + 冒烟测试 + 修复 | **✅ 产品完整上线** |

---

## 十二、部署方案

### 环境变量清单

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # 仅服务端，危险

# DeepSeek
DEEPSEEK_API_KEY=sk-...                   # 仅服务端

# 支付配置（可选，根据实际接入的支付方式配置）
PAYMENT_PROVIDER=manual                   # 'manual'|'hupijiao'|'alipay'|'paypal'

# 虎皮椒支付（待接入时配置）
# HUPIJIAO_PID=...                        # 商户 ID
# HUPIJIAO_KEY=...                        # 签名密钥，仅服务端
# HUPIJIAO_NOTIFY_URL=https://你的域名/api/payment/webhook

# 支付宝官方（待接入时配置）
# ALIPAY_APP_ID=...
# ALIPAY_PRIVATE_KEY=...
# ALIPAY_PUBLIC_KEY=...

# PayPal 配置
PAYPAL_RECEIVE_LINK=PayPal.Me/SoulfulCai  # 收款链接

# Upstash Redis（限流）
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# 管理员初始化
ADMIN_EMAILS=admin@example.com
```

### 上线检查清单

```markdown
功能验收：
□ 注册/登录/注销正常
□ 文档 CRUD 正常，字数/积分实时预览准确
□ 7个内置透镜均可流式输出
□ 自定义透镜创建/使用正常
□ 积分扣减准确（并发压测：无超扣）
□ 语音输入在 iOS Safari 和 Android Chrome 均可用
□ 三格式复制（Markdown/纯文本/富文本）均正常（非HTTPS环境优雅降级）
□ 充值入口显示正常，点击后提示"功能开发中"并显示 PayPal 收款链接
□ 管理员手动充值/扣减积分正常（核心功能）
□ 用户可通过四个入口提交反馈，提交后可在 Profile 查看状态
□ 管理员可在 /admin/feedbacks 查看、处理反馈，回复内容用户可见
□ 支付异常行显示"有问题？"入口，点击预填支付反馈表单

安全验收：
□ 未登录无法访问主应用任何路由
□ 非管理员无法访问 /admin 路由
□ Chrome DevTools Network 中无 API Key 出现
□ 限流生效（快速连续请求返回 429）
□ 积分不足时 AI 分析被拒绝（返回 402）

PWA 验收：
□ iOS Safari 弹出"添加到主屏幕"提示
□ 安装到桌面后可正常打开
□ manifest.json 图标、名称正确
```

---

## 十一、v2 迭代功能（本次不做）

| 功能 | 理由 |
|------|------|
| PDF / Word 导出 | 复杂度高，MVP 阶段三格式复制已满足需求 |
| 透镜市场（分享/评分） | 需要内容审核机制，v2 单独规划 |
| 官方微信/支付宝商户 | 需营业执照，申请后通过切换 PAYMENT_PROVIDER 环境变量替换，无需改动业务代码 |
| 团队协作（文档共享） | 权限模型复杂，v2 规划 |
| 文档版本历史 | 存储成本较高，v2 规划 |

---

*Crusher · 碎石记 · 产品设计全案 v2 · 由 Claude Code 协助设计*
