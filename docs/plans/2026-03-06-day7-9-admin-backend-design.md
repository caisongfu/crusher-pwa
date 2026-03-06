# Day 7-9 管理后台与上线部署设计文档

> 项目：Crusher（碎石记）
> 设计日期：2026-03-06
> 状态：设计完成，待实施
> 设计周期：3天（Day 7-9）

---

## 一、设计概述

### 1.1 目标

构建完整的管理后台系统并完成生产环境上线，包括：
- **Day 7**：管理后台基础功能（用户管理、积分管理、订单管理、用量统计）
- **Day 8**：管理后台进阶功能 + 安全加固（Prompt 管理、公告管理、反馈管理）
- **Day 9**：生产环境部署 + 上线验证

### 1.2 设计原则

- **YAGNI**：不过度设计，只实现必要功能
- **安全优先**：所有敏感操作需要审计和权限控制
- **渐进增强**：基础功能优先，高级功能后期迭代
- **统一设计**：管理后台与用户端保持 UI 一致性

---

## 二、Day 7：管理后台基础

### 2.1 目录结构

```
src/app/admin/
├── layout.tsx                          # 管理后台统一布局
├── page.tsx                            # 用户列表页
├── users/
│   └── [id]/page.tsx                  # 用户详情页
├── orders/
│   └── page.tsx                       # 订单列表页
└── stats/
    └── page.tsx                       # 用量统计页

src/app/api/admin/
├── users/route.ts                     # GET: 用户列表
├── users/[id]/route.ts                # GET/PUT: 用户详情 + 禁用
├── credits/route.ts                   # POST: 手动充值/扣减
├── credits/approve/route.ts            # POST: 审批积分操作
├── orders/route.ts                    # GET: 订单列表
├── refunds/route.ts                   # POST: 申请退款
├── refunds/[id]/route.ts              # PATCH: 审核退款
└── stats/route.ts                     # GET: 用量统计数据

src/components/admin/
├── admin-layout.tsx                    # 管理后台布局组件
├── user-list.tsx                       # 用户列表
├── user-detail.tsx                     # 用户详情
├── order-list.tsx                      # 订单列表
├── stats-charts.tsx                   # 统计图表
├── credit-form.tsx                     # 积分操作表单
└── refund-dialog.tsx                   # 退款对话框
```

---

### 2.2 用户管理模块

#### 2.2.1 功能特性

**用户列表页 (`/admin`)**
- 搜索功能：邮箱模糊搜索
- 筛选功能：
  - 状态：全部 / 正常 / 已禁用登录 / 已禁用使用
  - 积分范围：>100 / 50-100 / <50
- 分页：每页 20 条
- 表格列：
  - 用户：头像 + 邮箱 + 注册时间
  - 积分余额：当前积分数
  - 状态：
    - `正常`：可登录、可使用
    - `禁止登录`：不能登录
    - `禁止使用`：可登录、可查询记录、无功能操作
  - 操作：查看详情 / 禁用切换

**用户详情页 (`/admin/users/[id]`)**
- 用户信息卡片
- 积分操作表单（需要第二管理员审批）
- 积分流水表格（只读，不可修改）

#### 2.2.2 禁用机制

```typescript
// 禁用类型
enum DisableType {
  NORMAL = 'normal',              // 正常
  LOGIN_DISABLED = 'login_disabled',    // 禁止登录
  USAGE_DISABLED = 'usage_disabled'      // 禁止使用
}

// Middleware 逻辑
if (user.disable_type === DisableType.LOGIN_DISABLED) {
  return redirect('/login?reason=account_disabled')
}

// 功能组件检查
if (user.disable_type === DisableType.USAGE_DISABLED) {
  // 允许查询文档列表
  // 禁止：创建文档、AI 分析、积分充值等操作
}
```

#### 2.2.3 API 接口定义

**GET /api/admin/users**
```typescript
// 请求参数
interface ListUsersQuery {
  page: number;
  limit: number = 20;
  search?: string;              // 邮箱模糊搜索
  status?: DisableType;
  creditsMin?: number;
  creditsMax?: number;
}

// 响应数据
interface ListUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

interface User {
  id: string;
  email: string;
  username: string | null;
  credits: number;
  disable_type: DisableType;
  created_at: string;
}
```

**PUT /api/admin/users/[id]**
```typescript
// 请求参数
interface UpdateUserRequest {
  disable_type: DisableType;
}

// 响应数据
interface UpdateUserResponse {
  success: boolean;
  user: User;
}
```

---

### 2.3 积分管理模块

#### 2.3.1 功能特性

**双重审批机制**

```
管理员 A 发起积分操作
    ↓
记录到 pending_credit_transactions 表
    ↓
管理员 B 审批通过/拒绝
    ↓
审批通过 → 执行积分变更 + 写入 credit_transactions
审批拒绝 → 更新状态为 rejected
```

**邮件通知**
- 积分增加时，发送邮件通知用户
- 使用 Supabase Auth 邮件发送功能

**审计日志**
- 所有积分操作额外记录到 `credit_operations_audit` 表
- 记录不可修改

#### 2.3.2 数据库变更

```sql
-- 待审批积分操作表
CREATE TABLE pending_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount INTEGER NOT NULL,          -- 正数=充值，负数=扣减
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
CREATE TABLE credit_operations_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,      -- 'grant' | 'deduct' | 'approve' | 'reject'
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount INTEGER,
  balance_before INTEGER,
  balance_after INTEGER,
  operator_id UUID NOT NULL REFERENCES profiles(id),
  operation_time TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  details JSONB
);

-- 禁用类型字段更新
ALTER TABLE profiles ADD COLUMN disable_type TEXT DEFAULT 'normal'
CHECK (disable_type IN ('normal', 'login_disabled', 'usage_disabled'));

-- 索引
CREATE INDEX idx_pending_credit_status ON pending_credit_transactions(status);
CREATE INDEX idx_audit_operation_time ON credit_operations_audit(operation_time DESC);
```

#### 2.3.3 API 接口定义

**POST /api/admin/credits**
```typescript
// 请求参数
interface CreateCreditOperationRequest {
  userId: string;
  amount: number;
  type: 'manual_grant' | 'admin_deduct';
  description: string;
}

// 响应数据
interface CreateCreditOperationResponse {
  success: boolean;
  pendingTransactionId: string;
  message: string;
}
```

**POST /api/admin/credits/approve**
```typescript
// 请求参数
interface ApproveCreditOperationRequest {
  transactionId: string;
  action: 'approve' | 'reject';
  rejectionReason?: string;  // 拒绝时必填
}

// 响应数据
interface ApproveCreditOperationResponse {
  success: boolean;
  message: string;
  newBalance?: number;
}
```

**GET /api/admin/credits/pending**
```typescript
// 响应数据
interface PendingTransactionsResponse {
  transactions: PendingTransaction[];
}

interface PendingTransaction {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  type: string;
  description: string;
  requested_by: string;
  requested_by_email: string;
  created_at: string;
}
```

---

### 2.4 订单管理模块

#### 2.4.1 功能特性

**订单列表页 (`/admin/orders`)**
- 搜索功能：订单号、用户邮箱
- 筛选功能：
  - 订单状态：待支付 / 已完成 / 已退款
  - 支付方式：虎皮椒 / 支付宝 / PayPal / 手动转账
  - 时间范围
- 分页：每页 20 条
- 表格列：
  - 订单号：out_trade_no（可复制）
  - 用户：邮箱（可跳转用户详情）
  - 套餐：入门/标准/专业包
  - 金额：¥xx.xx
  - 支付方式
  - 状态（带颜色标识）
  - 创建时间
- 点击订单号显示详情（侧抽屉）

**轮询补单**
- 定时任务每 5 分钟检查 pending 订单
- 调用支付平台查询接口
- 如果已支付但未回调，手动补单

**退款流程**
- 用户在 Profile 页面申请退款
- 管理员在订单列表审核退款
- 退款通过 → 扣除积分 → 订单状态更新

#### 2.4.2 数据库变更

```sql
-- 退款申请表
CREATE TABLE refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES payment_orders(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_refund_status ON refund_requests(status);
CREATE INDEX idx_refund_order ON refund_requests(order_id);
```

#### 2.4.3 API 接口定义

**GET /api/admin/orders**
```typescript
// 请求参数
interface ListOrdersQuery {
  page: number;
  limit: number = 20;
  search?: string;              // 订单号或用户邮箱
  status?: 'pending' | 'paid' | 'refunded';
  paymentProvider?: 'hupijiao' | 'alipay' | 'paypal' | 'manual';
  dateFrom?: string;
  dateTo?: string;
}

// 响应数据
interface ListOrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

interface Order {
  id: string;
  out_trade_no: string;
  platform_order: string | null;
  user_id: string;
  user_email: string;
  package_name: string;
  amount_fen: number;
  credits_granted: number;
  payment_provider: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}
```

**POST /api/admin/refunds**
```typescript
// 请求参数
interface CreateRefundRequest {
  orderId: string;
  reason: string;
}

// 响应数据
interface CreateRefundResponse {
  success: boolean;
  requestId: string;
  message: string;
}
```

**PATCH /api/admin/refunds/[id]**
```typescript
// 请求参数
interface UpdateRefundRequest {
  action: 'approve' | 'reject';
  rejectionReason?: string;
}

// 响应数据
interface UpdateRefundResponse {
  success: boolean;
  message: string;
}
```

---

### 2.5 用量统计模块

#### 2.5.1 功能特性

**混合统计策略**
- 今日数据：实时查询数据库
- 历史数据：预聚合（每小时更新）

**统计页面 (`/admin/stats`)**
- 顶部 4 个关键指标卡片
  - 总用户数
  - 今日活跃用户
  - 累计消费积分
  - 今日收入
- 每日 AI 调用量趋势图（折线图，最近 30 天）
- 透镜使用分布图（饼图）
- 积分消耗趋势图（柱状图，最近 30 天）

#### 2.5.2 数据库变更

```sql
-- 每日统计预聚合表
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  total_insights INTEGER DEFAULT 0,
  total_credits_consumed INTEGER DEFAULT 0,
  total_revenue_fen INTEGER DEFAULT 0,
  lens_distribution JSONB DEFAULT '{}',    -- { "requirements": 100, "meeting": 80, ... }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_daily_stats_date ON daily_stats(date DESC);
```

#### 2.5.3 统计聚合函数

```sql
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
    'lens_distribution', (
      SELECT json_object_agg(lens_type, count)
      FROM (
        SELECT lens_type, COUNT(*) as count
        FROM insights
        WHERE created_at >= CURRENT_DATE
        GROUP BY lens_type
      ) subquery
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 更新每日统计（定时任务调用）
CREATE OR REPLACE FUNCTION update_daily_stats(p_date DATE DEFAULT CURRENT_DATE) RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_stats (date, total_users, active_users, total_insights, total_credits_consumed, lens_distribution)
  VALUES (
    p_date,
    (SELECT COUNT(*) FROM profiles WHERE created_at < p_date + INTERVAL '1 day'),
    (SELECT COUNT(DISTINCT user_id) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'),
    (SELECT COUNT(*) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'),
    COALESCE((SELECT SUM(credits_cost) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'), 0),
    (SELECT json_object_agg(lens_type, count)
      FROM (
        SELECT lens_type, COUNT(*) as count
        FROM insights
        WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'
        GROUP BY lens_type
      ) subquery)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    total_insights = EXCLUDED.total_insights,
    total_credits_consumed = EXCLUDED.total_credits_consumed,
    lens_distribution = EXCLUDED.lens_distribution,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

#### 2.5.4 API 接口定义

**GET /api/admin/stats**
```typescript
// 请求参数
interface GetStatsQuery {
  period: 'today' | 'week' | 'month' | '30days';
}

// 响应数据
interface StatsResponse {
  overview: {
    totalUsers: number;
    todayActiveUsers: number;
    totalCreditsConsumed: number;
    todayRevenue: number;
  };
  dailyTrend: {
    date: string;
    insights: number;
    creditsConsumed: number;
  }[];
  lensDistribution: {
    lensType: string;
    count: number;
    percentage: number;
  }[];
  creditsTrend: {
    date: string;
    consumed: number;
  }[];
}
```

---

## 三、Day 8：管理后台进阶 + 安全

### 3.1 目录结构

```
src/app/admin/
├── prompts/
│   └── page.tsx                       # Prompt 版本管理页
├── announcements/
│   └── page.tsx                       # 公告管理页
└── feedbacks/
    └── page.tsx                       # 反馈管理页

src/app/api/admin/
├── prompts/
│   ├── route.ts                       # GET: Prompt 版本列表
│   ├── [id]/route.ts                  # GET/PATCH: Prompt 详情 + 激活
│   └── test/route.ts                  # POST: 测试 Prompt
├── announcements/
│   ├── route.ts                       # GET/POST: 公告列表 + 创建
│   └── [id]/route.ts                  # PUT/DELETE: 更新/删除公告
└── feedbacks/
    ├── route.ts                       # GET: 反馈列表
    └── [id]/route.ts                  # PATCH: 更新反馈状态

src/components/admin/
├── prompt-editor.tsx                  # CodeMirror 编辑器
├── prompt-tester.tsx                  # Prompt 测试器
├── announcement-form.tsx              # 公告表单
└── feedback-list.tsx                  # 反馈列表
```

---

### 3.2 Prompt 版本管理模块

#### 3.2.1 功能特性

**Prompt 管理页 (`/admin/prompts`)**
- 透镜类型选择器（7个内置透镜）
- 当前激活版本显示
- Prompt 编辑器（CodeMirror）
- 版本历史列表
- 激活/回滚按钮
- 测试功能（输入文本 → API → 结果）

**CodeMirror 集成**
- 轻量级代码编辑器
- 语法高亮（支持 Markdown）
- 行号显示
- 自动保存（本地存储）

#### 3.2.2 组件设计

```typescript
// src/components/admin/prompt-editor.tsx
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';

export function PromptEditor({
  value,
  onChange,
  readOnly = false,
}: PromptEditorProps) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={[markdown()]}
      readOnly={readOnly}
      theme="light"
      height="400px"
    />
  );
}

// src/components/admin/prompt-tester.tsx
export function PromptTester({ lensType, systemPrompt }: Props) {
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTest = async () => {
    setIsLoading(true);
    const result = await fetch('/api/admin/prompts/test', {
      method: 'POST',
      body: JSON.stringify({ lensType, testInput }),
    });
    setTestResult(await result.text());
    setIsLoading(false);
  };

  return (
    <div>
      <textarea
        value={testInput}
        onChange={(e) => setTestInput(e.target.value)}
        placeholder="输入测试文本..."
      />
      <button onClick={handleTest} disabled={isLoading}>
        {isLoading ? '测试中...' : '测试 Prompt'}
      </button>
      {testResult && (
        <div className="mt-4 p-4 border rounded">
          <h3>测试结果：</h3>
          <ReactMarkdown>{testResult}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
```

#### 3.2.3 API 接口定义

**GET /api/admin/prompts**
```typescript
// 请求参数
interface GetPromptsQuery {
  lensType: LensType;
}

// 响应数据
interface PromptsResponse {
  versions: PromptVersion[];
  activeVersion: string;
}

interface PromptVersion {
  id: string;
  version: string;
  lens_type: string;
  system_prompt: string;
  is_active: boolean;
  notes: string | null;
  created_by: string;
  created_at: string;
}
```

**POST /api/admin/prompts**
```typescript
// 请求参数
interface CreatePromptRequest {
  lensType: LensType;
  systemPrompt: string;
  notes: string;
}

// 响应数据
interface CreatePromptResponse {
  success: boolean;
  version: PromptVersion;
}
```

**POST /api/admin/prompts/test**
```typescript
// 请求参数
interface TestPromptRequest {
  lensType: LensType;
  testInput: string;
}

// 响应数据（流式）
// 返回 Markdown 格式的分析结果
```

**PATCH /api/admin/prompts/[id]/activate**
```typescript
// 响应数据
interface ActivatePromptResponse {
  success: boolean;
  message: string;
  activeVersion: PromptVersion;
}
```

---

### 3.3 公告管理模块

#### 3.3.1 功能特性

**公告管理页 (`/admin/announcements`)**
- 公告列表（标题 / 类型 / 状态 / 到期时间）
- 新建/编辑公告
- Markdown 编辑器 + 预览
- 启用/禁用公告
- 按创建时间倒序

**公告类型**
- `info`：普通信息（蓝色）
- `warning`：警告（黄色）
- `maintenance`：维护通知（红色）

#### 3.3.2 组件设计

```typescript
// src/components/admin/announcement-form.tsx
export function AnnouncementForm({
  initialData,
  onSubmit,
}: AnnouncementFormProps) {
  const form = useForm({
    resolver: zodResolver(announcementSchema),
    defaultValues: initialData,
  });

  const [preview, setPreview] = useState('');

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input label="标题" {...form.register('title')} />
      <Select
        label="类型"
        options={[
          { value: 'info', label: 'ℹ️ 信息' },
          { value: 'warning', label: '⚠️ 警告' },
          { value: 'maintenance', label: '🔧 维护' },
        ]}
        {...form.register('type')}
      />
      <Textarea
        label="内容（Markdown）"
        {...form.register('content')}
        onChange={(e) => setPreview(e.target.value)}
      />
      {preview && (
        <div className="mt-4 p-4 border rounded">
          <h3>预览：</h3>
          <ReactMarkdown>{preview}</ReactMarkdown>
        </div>
      )}
      <DatePicker
        label="过期时间（可选）"
        {...form.register('expires_at')}
      />
      <Button type="submit">保存</Button>
    </form>
  );
}
```

#### 3.3.3 API 接口定义

**GET /api/admin/announcements**
```typescript
// 响应数据
interface AnnouncementsResponse {
  announcements: Announcement[];
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'maintenance';
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}
```

**POST /api/admin/announcements**
```typescript
// 请求参数
interface CreateAnnouncementRequest {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'maintenance';
  expires_at: string | null;
}
```

**PUT /api/admin/announcements/[id]**
```typescript
// 请求参数
interface UpdateAnnouncementRequest {
  title?: string;
  content?: string;
  type?: 'info' | 'warning' | 'maintenance';
  is_active?: boolean;
  expires_at?: string | null;
}
```

---

### 3.4 反馈管理模块

#### 3.4.1 功能特性

**反馈管理页 (`/admin/feedbacks`)**
- 反馈列表（类型 × 状态 × 时间范围筛选）
- 表格列：
  - 类型：💳 支付 / 🐛 Bug / 💡 建议 / 📝 其他
  - 标题
  - 用户：邮箱
  - 关联：订单号 / 页面 URL
  - 状态：⏳ 待处理 / 🔄 处理中 / ✅ 已解决 / 🚫 已关闭
  - 时间
- 点击行弹出详情侧抽屉
- 状态自由流转
- 管理员自行查看（无需主动通知）

**反馈统计图表**
- 每日新增反馈趋势图（折线图）
- 反馈类型分布饼图

#### 3.4.2 组件设计

```typescript
// src/components/admin/feedback-list.tsx
export function FeedbackList() {
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
  });
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  const { data: feedbacks } = useQuery({
    queryKey: ['admin', 'feedbacks', filters],
    queryFn: () => fetchFeedbacks(filters),
  });

  return (
    <div>
      {/* 筛选器 */}
      <div className="flex gap-4 mb-4">
        <Select
          value={filters.type}
          onChange={(type) => setFilters({ ...filters, type })}
          options={[
            { value: 'all', label: '全部类型' },
            { value: 'payment', label: '💳 支付问题' },
            { value: 'bug', label: '🐛 Bug 报告' },
            { value: 'feature', label: '💡 功能建议' },
            { value: 'other', label: '📝 其他' },
          ]}
        />
        <Select
          value={filters.status}
          onChange={(status) => setFilters({ ...filters, status })}
          options={[
            { value: 'all', label: '全部状态' },
            { value: 'pending', label: '⏳ 待处理' },
            { value: 'processing', label: '🔄 处理中' },
            { value: 'resolved', label: '✅ 已解决' },
            { value: 'closed', label: '🚫 已关闭' },
          ]}
        />
      </div>

      {/* 表格 */}
      <Table>
        <thead>
          <tr>
            <th>类型</th>
            <th>标题</th>
            <th>用户</th>
            <th>状态</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          {feedbacks?.map((feedback) => (
            <tr
              key={feedback.id}
              onClick={() => setSelectedFeedback(feedback)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <td>{getTypeIcon(feedback.type)}</td>
              <td>{feedback.title}</td>
              <td>{feedback.user_email}</td>
              <td>{getStatusBadge(feedback.status)}</td>
              <td>{formatDate(feedback.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* 详情侧抽屉 */}
      {selectedFeedback && (
        <FeedbackDrawer
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onUpdate={handleUpdateFeedback}
        />
      )}
    </div>
  );
}
```

#### 3.4.3 API 接口定义

**GET /api/admin/feedbacks**
```typescript
// 请求参数
interface GetFeedbacksQuery {
  type?: 'payment' | 'bug' | 'feature' | 'other';
  status?: 'pending' | 'processing' | 'resolved' | 'closed';
  page: number;
  limit: number = 20;
}

// 响应数据
interface FeedbacksResponse {
  feedbacks: Feedback[];
  total: number;
  page: number;
  limit: number;
}

interface Feedback {
  id: string;
  user_id: string;
  user_email: string;
  type: string;
  title: string;
  content: string;
  context_url: string | null;
  related_order_id: string | null;
  related_insight_id: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}
```

**PATCH /api/admin/feedbacks/[id]**
```typescript
// 请求参数
interface UpdateFeedbackRequest {
  status: 'pending' | 'processing' | 'resolved' | 'closed';
  admin_note?: string;
}
```

**GET /api/admin/feedbacks/stats**
```typescript
// 响应数据
interface FeedbackStatsResponse {
  dailyTrend: {
    date: string;
    count: number;
  }[];
  typeDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
}
```

---

### 3.5 安全加固模块

#### 3.5.1 动态限流

**限流策略**
- 普通用户：20 次/分钟
- VIP 用户（积分 > 500）：50 次/分钟
- 管理员：无限制

**实现**
```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
});

export async function checkRateLimit(userId: string, userCredits: number) {
  // 根据用户等级调整限流
  const limit = userCredits > 500 ? 50 : 20;

  const { success, remaining, reset } = await ratelimit.limit(userId);

  if (!success) {
    const resetTime = new Date(reset);
    return {
      allowed: false,
      remaining,
      resetTime,
      message: `请求过于频繁，请在 ${resetTime.toLocaleString()} 后重试`,
    };
  }

  return { allowed: true, remaining };
}
```

**限流降级**
```typescript
// api/insights/route.ts
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  const rateLimit = await checkRateLimit(user.id, profile.credits);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: rateLimit.message,
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime,
      },
      { status: 429 }
    );
  }

  // 继续处理请求...
}
```

#### 3.5.2 PWA 动态缓存

**缓存策略**
- 应用 Shell：永久缓存
- 静态资源（JS/CSS）：1 年缓存
- API 响应：不缓存
- 用户频繁访问的文档详情：动态缓存（7 天）

**实现**
```typescript
// public/sw.js（next-pwa 自动生成）
// 在 next.config.ts 中配置
const withPWA = require('@ducanh2912/next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https?.+\.(png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 天
        },
      },
    },
  ],
});
```

#### 3.5.3 CSRF 防护

Next.js 内置 CSRF Token 配置：
```typescript
// next.config.ts
module.exports = {
  experimental: {
    csrfToken: true,
  },
};
```

#### 3.5.4 多环境配置

**环境变量文件**
```bash
# .env.development
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
DEEPSEEK_API_KEY=sk-dev-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
PAYPAL_RECEIVE_LINK=PayPal.Me/SoulfulCai-Dev

# .env.production
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
DEEPSEEK_API_KEY=sk-prod-...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
PAYPAL_RECEIVE_LINK=PayPal.Me/SoulfulCai
```

#### 3.5.5 数据库迁移

**新增迁移文件**
```
supabase/migrations/
├── 20260306_day7_admin_backend.sql
├── 20260306_day7_credit_operations_audit.sql
├── 20260306_day7_refund_requests.sql
├── 20260306_day7_daily_stats.sql
└── 20260306_day8_profile_disable_type.sql
```

#### 3.5.6 监控集成

**Vercel Analytics**
```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 四、Day 9：上线部署

### 4.1 部署配置

#### 4.1.1 Vercel 部署

**项目配置**
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["hkg1"],
  "env": {
    "NEXT_PUBLIC_APP_URL": "@app-url",
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

**环境变量（Vercel Dashboard）**
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase 服务角色密钥（仅服务端）
- `DEEPSEEK_API_KEY`：DeepSeek API 密钥
- `PAYPAL_RECEIVE_LINK`：PayPal 收款链接

#### 4.1.2 域名配置

**初始部署**
- 使用 Vercel 免费域名：`https://crusher-xxx.vercel.app`

**后续自定义域名（可选）**
- 在 Vercel Dashboard 中添加自定义域名
- 配置 DNS 记录
- 自动配置 HTTPS（Let's Encrypt）

#### 4.1.3 数据库配置

**Supabase 区域选择**
- 选择亚太区域（新加坡或东京）
- 更新 `NEXT_PUBLIC_SUPABASE_URL`

**数据库备份**
- Supabase 自动备份（每天）
- 可手动下载备份

**密钥管理**
- 使用 HashiCorp Vault 管理敏感密钥
- 或使用 Supabase Secrets（简化方案）

#### 4.1.4 安全加固

**HTTPS 配置**
- Vercel 自动配置 HTTPS
- 证书由 Let's Encrypt 提供

**MFA 配置**
- Supabase Auth 支持 MFA
- 启用管理员 MFA

**访问控制**
- 限制管理后台访问（IP 白名单）
- 配置 Supabase RLS 策略

---

### 4.2 测试验证

#### 4.2.1 冒烟测试清单

**自动化测试**
```typescript
// tests/e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('用户注册登录流程', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('文档创建和 AI 分析', async ({ page }) => {
    await page.goto('/capture');
    await page.fill('textarea[name="content"]', '测试内容');
    await page.click('button:has-text("提交")');
    await page.waitForSelector('[data-testid="lens-selector"]');
    await page.click('[data-testid="lens-requirements"]');
    await expect(page.locator('[data-testid="insight-result"]')).toBeVisible();
  });

  test('管理员登录', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'Admin123456');
    await page.click('button[type="submit"]');
    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText('用户管理');
  });
});
```

**手动测试清单**
```markdown
## 冒烟测试清单

### 用户端
- [ ] 注册新用户
- [ ] 登录已注册用户
- [ ] 创建文档（文本输入）
- [ ] 语音输入（Web Speech API）
- [ ] 使用不同透镜分析文档
- [ ] 复制 AI 结果（3种格式）
- [ ] 查看积分余额
- [ ] 提交反馈（4个入口）
- [ ] 查看公告横幅

### 管理端
- [ ] 管理员登录
- [ ] 查看用户列表
- [ ] 搜索和筛选用户
- [ ] 查看用户详情
- [ ] 禁用/启用用户
- [ ] 创建积分操作（需要审批）
- [ ] 审批积分操作
- [ ] 查看订单列表
- [ ] 处理退款申请
- [ ] 查看用量统计图表
- [ ] 编辑 Prompt 版本
- [ ] 测试 Prompt 效果
- [ ] 创建/编辑公告
- [ ] 处理用户反馈

### 安全
- [ ] 未登录无法访问主应用
- [ ] 非管理员无法访问 /admin
- [ ] 限流生效（返回 429）
- [ ] 积分不足时拒绝分析
- [ ] CSRF 防护正常

### PWA
- [ ] iOS Safari 可添加到主屏幕
- [ ] 安装到桌面后可正常打开
- [ ] 离线缓存正常
```

#### 4.2.2 并发能力测试

**Artillery 压力测试**
```yaml
# tests/load/insights.yml
config:
  target: "https://crusher-xxx.vercel.app"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  processor: "./processor.js"

scenarios:
  - name: "AI Analysis"
    flow:
      - post:
          url: "/api/insights"
          json:
            documentId: "{{ $randomString() }}"
            lensType: "requirements"
          headers:
            Authorization: "Bearer {{ $processEnvironment.TOKEN }}"
          capture:
            - json: "$.result"
              as: "insight"
```

**执行测试**
```bash
artillery run tests/load/insights.yml
```

---

### 4.3 监控运维

#### 4.3.1 日志收集

**Vercel Logs**
- 内置日志收集
- 保留 7 天（免费计划）
- 可搜索和过滤

**自定义日志格式**
```typescript
// lib/logger.ts
export function logger(context: string, message: string, data?: any) {
  const log = {
    timestamp: new Date().toISOString(),
    context,
    message,
    data,
    env: process.env.NODE_ENV,
  };

  console.log(JSON.stringify(log));

  // 可选：发送到外部日志服务
  // logToExternal(log);
}
```

#### 4.3.2 性能监控

**Google Analytics**
```typescript
// src/app/layout.tsx
import GoogleAnalytics from '@/components/google-analytics';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
```

**监控指标**
- PV（页面浏览量）
- UV（独立访客）
- 平均会话时长
- 跳出率
- 核心功能转化率

#### 4.3.3 告警机制

**邮件告警**
```typescript
// lib/alerts.ts
export async function sendAlert(
  type: 'error' | 'warning' | 'info',
  message: string,
  details?: any
) {
  const subject = `[Crusher ${type.toUpperCase()}] ${message}`;
  const body = `
    时间：${new Date().toISOString()}
    类型：${type}
    消息：${message}
    详情：${JSON.stringify(details, null, 2)}
  `;

  // 发送邮件到管理员
  await supabase.from('admin_alerts').insert({
    type,
    message,
    details,
    created_at: new Date().toISOString(),
  });
}

// 在关键位置调用
try {
  // 业务逻辑
} catch (error) {
  await sendAlert('error', '业务异常', error);
}
```

#### 4.3.4 回滚策略

**Vercel 一键回滚**
```bash
# 使用 Vercel CLI
vercel rollback [deployment-url]

# 或在 Vercel Dashboard 中点击回滚
```

**回滚检查清单**
- [ ] 验证回滚是否成功
- [ ] 检查数据库状态
- [ ] 检查用户数据是否受影响
- [ ] 通知相关人员

#### 4.3.5 故障响应

**故障等级定义**
```markdown
## 故障等级

### P0 - 严重故障
- 定义：核心功能完全不可用，影响所有用户
- 响应时间：5 分钟内
- 解决时间：1 小时内
- 通知方式：邮件 + 短信 + 电话

### P1 - 重要故障
- 定义：部分功能不可用，影响部分用户
- 响应时间：15 分钟内
- 解决时间：4 小时内
- 通知方式：邮件 + 短信

### P2 - 一般故障
- 定义：功能异常，但不影响核心使用
- 响应时间：1 小时内
- 解决时间：24 小时内
- 通知方式：邮件

### P3 - 轻微故障
- 定义：UI/UX 问题，不影响功能
- 响应时间：24 小时内
- 解决时间：7 天内
- 通知方式：邮件（每周汇总）
```

**故障响应流程**
```
故障发现
    ↓
评估故障等级（P0/P1/P2/P3）
    ↓
通知相关人员
    ↓
定位问题根因
    ↓
临时修复 / 回滚
    ↓
彻底修复
    ↓
验证和测试
    ↓
故障复盘（5 Why 分析）
    ↓
更新流程和文档
```

---

## 五、技术决策汇总

### 5.1 Day 7 决策

| # | 决策点 | 选择方案 |
|---|--------|----------|
| 1 | 用户列表分页 | 分页（每页 20 条） |
| 2 | 性能优化 | 后期再做 |
| 3 | 禁用机制 | 分为：禁止登录 / 禁止使用 |
| 4 | 手动充值审批 | 第二管理员审批 |
| 5 | 积分操作审计 | 额外记录 + 不可修改 + 邮件通知 |
| 6 | 积分扣减并发 | 数据库行锁 |
| 7 | 订单补单 | 轮询 + 手动补单 |
| 8 | 退款流程 | 申请 + 审核 |
| 9 | 统计策略 | 混合统计（今日实时，历史预聚合） |
| 10 | 图表交互 | 暂时只展示数据 |
| 11 | UI 设计 | 统一 UI 设计 |
| 12 | 移动端管理 | 不考虑移动端管理 |
| 13 | 权限控制 | 资源控制 |
| 14 | 操作审计 | 记录 API 请求 |

### 5.2 Day 8 决策

| # | 决策点 | 选择方案 |
|---|--------|----------|
| 1 | Prompt 编辑器 | CodeMirror 轻量编辑器 |
| 2 | Prompt 测试 | 输入文本 → 调用 API → 展示结果 |
| 3 | Prompt 回滚 | 版本列表激活按钮 |
| 4 | 公告编辑器 | Markdown + 预览 |
| 5 | 公告展示 | 首页顶部横幅 |
| 6 | 公告排序 | 按创建时间倒序 |
| 7 | 反馈状态流转 | 自由流转 |
| 8 | 反馈通知 | 管理员自行查看 |
| 9 | 反馈统计 | 每日趋势 + 类型分布 |
| 10 | 限流策略 | 动态限流（根据用户等级） |
| 11 | 限流降级 | 返回 429 + 建议等待时间 |
| 12 | PWA 缓存 | 动态缓存 |
| 13 | CSRF 防护 | Next.js 内置 Token |
| 14 | 环境变量 | 多环境配置文件 |
| 15 | 数据库迁移 | Supabase Migrations |
| 16 | 监控 | Vercel Analytics |

### 5.3 Day 9 决策

| # | 决策点 | 选择方案 |
|---|--------|----------|
| 1 | 部署平台 | Vercel |
| 2 | 域名 | vercel.app 临时域名 |
| 3 | CDN | Vercel Edge Network |
| 4 | 数据库区域 | Supabase 亚太区域 |
| 5 | HTTPS | Vercel 自动 HTTPS |
| 6 | 密钥管理 | HashiCorp Vault |
| 7 | 数据库备份 | Supabase 自动备份 |
| 8 | 访问控制 | MFA 多因素认证 |
| 9 | 冒烟测试 | 混合模式（自动化 + 手动） |
| 10 | 测试数据 | 空数据库 |
| 11 | 压力测试 | 并发能力测试 |
| 12 | 日志收集 | Vercel Logs |
| 13 | 性能监控 | Google Analytics |
| 14 | 告警机制 | 邮件告警 |
| 15 | 回滚策略 | Vercel 一键回滚 |
| 16 | 故障响应 | 故障等级定义 |

---

## 六、数据库变更汇总

### 6.1 新增表

```sql
-- 待审批积分操作表
CREATE TABLE pending_credit_transactions (...);

-- 积分操作审计表
CREATE TABLE credit_operations_audit (...);

-- 退款申请表
CREATE TABLE refund_requests (...);

-- 每日统计预聚合表
CREATE TABLE daily_stats (...);
```

### 6.2 修改表

```sql
-- profiles 表新增字段
ALTER TABLE profiles ADD COLUMN disable_type TEXT DEFAULT 'normal';
```

### 6.3 新增函数

```sql
-- 获取今日统计
CREATE OR REPLACE FUNCTION get_today_stats() RETURNS JSON;

-- 更新每日统计
CREATE OR REPLACE FUNCTION update_daily_stats(p_date DATE) RETURNS VOID;
```

---

## 七、API 接口汇总

### 7.1 管理后台 API

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/admin/users` | GET | 用户列表 |
| `/api/admin/users/[id]` | PUT | 更新用户状态 |
| `/api/admin/credits` | POST | 创建积分操作 |
| `/api/admin/credits/approve` | POST | 审批积分操作 |
| `/api/admin/credits/pending` | GET | 待审批列表 |
| `/api/admin/orders` | GET | 订单列表 |
| `/api/admin/refunds` | POST | 申请退款 |
| `/api/admin/refunds/[id]` | PATCH | 审核退款 |
| `/api/admin/stats` | GET | 用量统计 |
| `/api/admin/prompts` | GET | Prompt 版本列表 |
| `/api/admin/prompts` | POST | 创建 Prompt 版本 |
| `/api/admin/prompts/test` | POST | 测试 Prompt |
| `/api/admin/prompts/[id]/activate` | PATCH | 激活 Prompt |
| `/api/admin/announcements` | GET | 公告列表 |
| `/api/admin/announcements` | POST | 创建公告 |
| `/api/admin/announcements/[id]` | PUT | 更新公告 |
| `/api/admin/feedbacks` | GET | 反馈列表 |
| `/api/admin/feedbacks/[id]` | PATCH | 更新反馈状态 |
| `/api/admin/feedbacks/stats` | GET | 反馈统计 |

---

## 八、组件依赖

### 8.1 新增依赖

```json
{
  "dependencies": {
    "@uiw/react-codemirror": "^4.21.21",
    "@codemirror/lang-markdown": "^6.2.4",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.41.0",
    "artillery": "^2.0.5"
  }
}
```

### 8.2 现有依赖复用

- `react-markdown`：Markdown 渲染
- `sonner`：Toast 通知
- `react-hook-form`：表单处理
- `zod`：表单验证
- `@upstash/ratelimit`：限流
- `@upstash/redis`：Redis 客户端

---

## 九、时间规划

### 9.1 Day 7 任务分解

| 时间 | 任务 | 预计工时 |
|------|------|----------|
| 上午 | 用户管理模块开发 | 3h |
| 上午 | 积分管理模块开发 | 2h |
| 下午 | 订单管理模块开发 | 2h |
| 下午 | 用量统计模块开发 | 2h |
| 晚上 | 测试和调试 | 1h |

### 9.2 Day 8 任务分解

| 时间 | 任务 | 预计工时 |
|------|------|----------|
| 上午 | Prompt 版本管理 | 3h |
| 上午 | 公告管理模块 | 2h |
| 下午 | 反馈管理模块 | 2h |
| 下午 | 安全加固（限流、CSRF） | 2h |
| 晚上 | 测试和调试 | 1h |

### 9.3 Day 9 任务分解

| 时间 | 任务 | 预计工时 |
|------|------|----------|
| 上午 | 环境配置和部署 | 2h |
| 上午 | 数据库迁移 | 1h |
| 下午 | 冒烟测试 | 2h |
| 下午 | 压力测试 | 2h |
| 晚上 | 上线验证和文档 | 1h |

---

## 十、风险和注意事项

### 10.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Supabase 区域延迟 | 用户访问慢 | 选择亚太区域（新加坡/东京） |
| 并发积分超扣 | 用户积分异常 | 数据库行锁 + 事务 |
| Web Speech API 不兼容 | 部分用户无法语音输入 | 降级到文本输入 |
| DeepSeek API 限流 | AI 分析失败 | 错误提示 + 重试机制 |

### 10.2 业务风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 用户滥用积分 | 成本增加 | 限流 + 异常检测 |
| 支付异常 | 用户投诉 | 轮询补单 + 退款流程 |
| 恶意反馈 | 管理员负担 | 反馈限流 + 自动分类 |

### 10.3 安全风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| API Key 泄露 | 数据泄露 | 服务端存储 + 代码审查 |
| CSRF 攻击 | 恶意操作 | CSRF Token + SameSite Cookie |
| SQL 注入 | 数据泄露 | 参数化查询 + RLS |

---

## 十一、后续迭代方向

### 11.1 v2 规划

- PDF / Word 导出功能
- 透镜市场（分享/评分）
- 官方微信/支付宝商户
- 团队协作（文档共享）
- 文档版本历史
- 移动端管理界面

### 11.2 性能优化

- 虚拟滚动（大数据量列表）
- 图片懒加载
- CDN 加速国内访问
- 数据库查询优化

### 11.3 功能增强

- 积分明细导出
- 用户行为分析
- A/B 测试框架
- 自动化测试覆盖

---

**文档结束**

---

*设计文档版本：v1.0*
*最后更新：2026-03-06*
*设计者：Claude Code*
