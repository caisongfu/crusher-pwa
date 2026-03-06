# Day 7 模块六 - 订单管理实施计划

**目标：** 实现订单管理、退款审核、用量统计功能

**架构：** 继续使用 Server Components + API Routes 模式，遵循已有的代码规范

---

## 模块六任务分解

### Task 14: 实现订单列表 API

**Files:**
- Create: `src/app/api/admin/orders/route.ts`

**功能：**
- 获取订单列表，支持分页
- 支持筛选：状态（pending/paid/failed/refunded）、日期范围
- 支持搜索：订单号、用户邮箱
- 关联查询用户信息

**返回数据：**
```typescript
{
  orders: {
    id: string
    user_id: string
    out_trade_no: string
    package_name: string
    amount_fen: number
    credits_granted: number
    status: 'pending' | 'paid' | 'failed' | 'refunded'
    paid_at: string | null
    created_at: string
    user: { id: string; email: string; username: string | null }
  }[]
  total: number
  page: number
  limit: number
}
```

**验证步骤：**
```bash
# 测试分页
curl "http://localhost:3000/api/admin/orders?page=1&limit=20"

# 测试状态筛选
curl "http://localhost:3000/api/admin/orders?status=paid"

# 测试搜索
curl "http://localhost:3000/api/admin/orders?search=test@example.com"
```

---

### Task 15: 实现退款请求 API

**Files:**
- Create: `src/app/api/admin/refunds/route.ts`
- Update: `src/app/api/admin/orders/[id]/route.ts` (if exists) or Create

**功能：**
- 创建退款申请（用户或管理员）
- 退款请求进入 `refund_requests` 表
- 双重审批：需要两个管理员批准
- 检查订单状态（只能退款已支付的订单）

**请求参数：**
```typescript
{
  orderId: string
  reason: string
  refundAmount?: number  // 默认为全额退款
}
```

**验证步骤：**
```bash
# 创建退款请求
curl -X POST "http://localhost:3000/api/admin/refunds" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"xxx","reason":"用户申请退款"}'
```

---

### Task 16: 实现退款审批 API

**Files:**
- Create: `src/app/api/admin/refunds/[id]/approve/route.ts`

**功能：**
- 管理员审批退款请求
- 验证审批人不是申请人
- 批准后：
  - 回退用户积分
  - 更新订单状态为 'refunded'
  - 记录积分交易流水
  - 更新退款请求状态
- 拒绝：记录拒绝原因

**请求参数：**
```typescript
{
  action: 'approve' | 'reject'
  rejectionReason?: string  // 拒绝时必填
}
```

**验证步骤：**
```bash
# 批准退款
curl -X POST "http://localhost:3000/api/admin/refunds/xxx/approve" \
  -H "Content-Type: application/json" \
  -d '{"action":"approve"}'
```

---

### Task 17: 实现用量统计 API

**Files:**
- Create: `src/app/api/admin/stats/route.ts`

**功能：**
- 使用数据库函数 `get_today_stats()` 获取实时统计
- 支持日期范围查询（查询 `daily_stats` 表）
- 返回关键指标：
  - 今日新增用户数
  - 今日订单数和收入
  - 今日积分消耗
  - 用户活跃度

**返回数据：**
```typescript
{
  date: string
  newUsers: number
  orders: number
  revenue: number  // 单位：分
  creditsConsumed: number
  activeUsers: number
  totalUsers: number
}
```

**验证步骤：**
```bash
# 获取今日统计
curl "http://localhost:3000/api/admin/stats"

# 获取历史统计
curl "http://localhost:3000/api/admin/stats?startDate=2026-03-01&endDate=2026-03-06"
```

---

### Task 18: 实现订单列表页面

**Files:**
- Create: `src/components/admin/order-list.tsx`
- Update: `src/app/admin/orders/page.tsx` (if exists) or Create

**功能：**
- 显示订单列表表格
- 分页控制
- 状态筛选
- 订单搜索
- 显示退款按钮（针对已支付订单）
- 点击订单跳转到详情

**UI 组件：**
- 使用已有的 Table 组件
- 使用已有的 Select 组件
- 使用 Input 组件进行搜索
- 状态徽章（pending: 黄色, paid: 绿色, failed: 红色, refunded: 灰色）

---

### Task 19: 实现用量统计页面

**Files:**
- Create: `src/components/admin/stats-charts.tsx`
- Update: `src/app/admin/stats/page.tsx` (if exists) or Create

**功能：**
- 显示今日关键指标卡片
- 收入趋势折线图（使用 Recharts）
- 用户增长趋势图
- 积分消耗统计图
- 日期范围选择器

**图表库：**
- 使用 Recharts (项目已安装 @radix-ui/primitives，需检查是否已安装 Recharts)
- 折线图：`<LineChart />`
- 柱状图：`<BarChart />`

---

## 验收标准

### 功能验收
- [ ] 订单列表能正常加载、分页、筛选
- [ ] 退款请求能成功创建
- [ ] 退款审批流程完整（批准/拒绝）
- [ ] 退款后积分正确回退
- [ ] 订单状态正确更新
- [ ] 用量统计数据准确
- [ ] 图表正常显示

### 安全验收
- [ ] 所有 API 验证管理员权限
- [ ] 退款审批不能自己审批自己的申请
- [ ] 只能退款已支付订单
- [ ] 输入参数使用 Zod 验证

### 性能验收
- [ ] 订单列表查询 < 200ms（分页查询）
- [ ] 统计 API 使用预聚合数据（daily_stats 表）
- [ ] 图表数据使用日期范围限制（避免查询过多数据）

---

## 执行顺序

按照 TDD 原则执行：
1. Task 14-17: API 开发（并行开发）
2. Task 18: 订单列表页面
3. Task 19: 用量统计页面

每个任务完成后：
1. 验证功能
2. 提交 git commit
3. 继续下一个任务
