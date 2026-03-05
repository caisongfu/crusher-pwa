# Day 6 自定义透镜 + 反馈系统 + 公告展示设计文档

> 日期：2026-03-05
> 阶段：Day 6 / 9天开发路线图
> 验收标准：用户可创建透镜，可提交反馈，公告可显示

## 目标

实现自定义透镜 CRUD，建立完整的用户反馈系统（含 4 个触发入口），前端展示系统公告横幅。

## 自定义透镜

### API 路由

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/lenses` | 获取当前用户的自定义透镜列表 |
| POST | `/api/lenses` | 创建透镜 |
| PATCH | `/api/lenses/[id]` | 更新透镜 |
| DELETE | `/api/lenses/[id]` | 软删除（is_active = false） |

### 入参校验（Zod）

```typescript
const CreateLensSchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().emoji().default('🔧'),
  description: z.string().max(200).optional(),
  system_prompt: z.string().min(10).max(5000),
})
```

### LensForm 组件（创建/编辑 Dialog）

```
名称（必填）
Emoji 图标：[🔧] 点击弹出 Emoji 选择器（常用 20 个 + 输入框）
描述（可选，最多 200 字）
System Prompt：
┌──────────────────────────────────────────────────┐
│  你是一个...请帮我分析以下内容：\n\n{content}     │
│  （多行文本，min-h: 120px）                       │
│  提示：使用 {content} 作为内容占位符               │
└──────────────────────────────────────────────────┘
[保存]  [取消]
```

### Lenses 管理页（/lenses）

```
[+ 新建自定义透镜]

─── 我的自定义透镜 ────────────────
[🔧] 周报整理  将流水账整理为标准周报格式   [编辑] [删除]
[📊] 数据分析  ...                         [编辑] [删除]

─── 内置透镜（只读）──────────────
📋 甲方需求  📝 会议纪要  🔍 需求评审  ...
```

### LensSelector 扩展（Day 4 → Day 6）

在内置透镜后追加用户自定义透镜，使用相同的选择交互。

### AI 分析支持自定义透镜

`POST /api/insights` 扩展：
- `lensType = 'custom'` 时，从 `custom_lenses` 表读取 `system_prompt`
- 积分消耗固定 10 积分/次（同内置基础档）

## 反馈系统

### API 路由

```
POST /api/feedbacks
  Body: { type, title, content, context_url?, related_order_id?, related_insight_id? }
  验证：auth.uid() 存在
  执行：INSERT feedbacks
  返回：{ id }

GET /api/feedbacks
  返回当前用户的反馈列表（含状态，按时间倒序）
```

### FeedbackForm 组件（通用 Dialog）

```
类型（单选，必选）：
  [💳 支付问题]  [🐛 Bug报告]  [💡 功能建议]  [📝 其他]

标题（必填，最多 100 字）
详情（必填，最多 2000 字，多行文本，显示字数）

关联信息（只读，根据入口携带，不携带则不显示）：
  订单号 / 页面 URL / Insight ID

[提交]  提交后 toast 成功提示
```

### 4 个触发入口

#### 入口 1：Profile → 我的反馈 Tab

```typescript
// 新建反馈按钮（无预填）
<FeedbackDialog />
```

#### 入口 2：全局浮动 `?` 按钮（FeedbackButton）

```typescript
// src/components/feedback-button.tsx
// 固定在页面右下角，所有 (main) 页面显示
// 自动预填：type='bug', context_url=window.location.href
<div className="fixed bottom-20 right-4 md:bottom-4 md:right-6 z-40">
  <FeedbackDialog
    defaultType="bug"
    defaultContextUrl={pathname}
    trigger={<Button size="icon" variant="outline">?</Button>}
  />
</div>
```

#### 入口 3：InsightResult `···` 菜单

```typescript
// 扩展 Day 4 的 InsightResult 组件
<DropdownMenuItem onClick={() => setFeedbackOpen(true)}>
  反馈内容问题
</DropdownMenuItem>
<FeedbackDialog
  defaultType="other"
  defaultRelatedInsightId={insight.id}
/>
```

#### 入口 4：积分流水中异常订单行

```typescript
// Profile 消费记录 Tab，订单状态为 failed 或 pending 超过 1 小时
{order.status !== 'paid' && (
  <FeedbackDialog
    defaultType="payment"
    defaultRelatedOrderId={order.id}
    trigger={<button className="text-xs text-zinc-400 hover:underline">有问题？</button>}
  />
)}
```

### Profile 页 → 我的反馈 Tab

```
状态筛选：[全部] [待处理] [处理中] [已解决] [已关闭]

反馈列表：
┌─────────────────────────────────────────────────────┐
│ 🐛 Bug报告  ⏳ 待处理    登录页面有时无法跳转         │
│ 2026-03-05 14:23                                    │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ 💳 支付问题  ✅ 已解决    积分未到账                  │
│ 管理员回复：已手动补发 100 积分，请查收               │
│ 2026-03-04 09:11                                    │
└─────────────────────────────────────────────────────┘
```

## 公告展示

### 服务端获取活跃公告

```typescript
// (main)/layout.tsx 中
const { data: announcements } = await supabase
  .from('announcements')
  .select('*')
  .eq('is_active', true)
  .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
  .order('created_at', { ascending: false })
```

### AnnouncementBanner 组件

```
info（蓝色）：
  ℹ️ 系统将于今晚 22:00 进行维护，预计 30 分钟   [×]

warning（橙色）：
  ⚠️ 充值功能即将上线，敬请期待！                [×]

maintenance（红色）：
  🔴 系统维护中，预计 22:30 恢复                  [×]
```

用户点击 `×` 后关闭（localStorage 记录已读 announcement id，刷新不重新显示）。

### Admin 公告管理（/admin/announcements，基础版）

Day 6 实现基础版（创建/停用），Day 8 细化编辑功能：
- 公告列表（标题 / 类型 / 状态 / 创建时间）
- 新建公告：标题 + 内容 + 类型 + 到期时间（可选）
- 停用按钮（is_active = false）

## 验收标准

- [ ] 用户可创建/编辑/删除自定义透镜
- [ ] 自定义透镜在 LensSelector 中与内置透镜并列显示
- [ ] 选择自定义透镜可触发 AI 分析（使用用户 system prompt）
- [ ] 4 个反馈入口均可打开表单，各自正确预填内容
- [ ] 提交反馈后 Profile → 我的反馈 Tab 可看到记录和状态
- [ ] 已解决/已关闭的反馈展示管理员回复
- [ ] 活跃公告在主应用顶部正确显示，关闭后不再重新出现
