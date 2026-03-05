# Day 4 AI 核心设计文档

> 日期：2026-03-05
> 阶段：Day 4 / 9天开发路线图
> 验收标准：流式 AI 输出正常，积分正确扣减

## 目标

集成 DeepSeek 流式输出，实现 7 个内置透镜（从 DB 读取 Prompt），完成积分扣减，支持语音输入全功能。

## API 路由设计

```
POST /api/insights
  - Zod 入参校验
  - 获取文档 + 验证归属
  - 计算积分费用
  - Upstash 限流（20次/分钟/用户）
  - 调用 deduct_credits() 原子扣减
  - 读取 system prompt（DB 优先，fallback 代码内置）
  - streamText → toDataStreamResponse()
  - onFinish: 保存 insight 记录
```

### 入参校验（Zod）

```typescript
const InsightRequestSchema = z.object({
  documentId: z.string().uuid(),
  lensType: z.enum(['requirements', 'meeting', 'review', 'risk', 'change', 'postmortem', 'tech', 'custom']),
  customLensId: z.string().uuid().optional(),
})
```

## DeepSeek 客户端

```typescript
// src/lib/deepseek.ts
import { createOpenAI } from '@ai-sdk/openai'

export const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: 'https://api.deepseek.com/v1',
})

export const deepseekModel = deepseek('deepseek-chat')
```

## System Prompts 架构

### 读取优先级

```
resolvePrompt(lensType, userId)
  1. 查 system_prompts 表：WHERE lens_type = ? AND is_active = true
  2. 未找到 → 使用代码内置 prompt（保证 fallback 可用）
  3. customLensType → 查 custom_lenses 表获取用户自定义 prompt
```

### 文件结构

```
src/lib/prompts/
  index.ts          ← resolvePrompt() 统一入口
  requirements.ts   ← 甲方需求整理
  meeting.ts        ← 会议纪要
  review.ts         ← 需求评审
  risk.ts           ← 风险识别
  change.ts         ← 变更影响分析
  postmortem.ts     ← 问题复盘（5Why 格式）
  tech.ts           ← 技术决策记录（ADR 格式）
```

每个 prompt 文件导出：
```typescript
export const requirementsPrompt = {
  system: '你是一位专业的需求分析师...',
  userTemplate: '请分析以下原始沟通记录：\n\n{content}',
}
```

## 积分扣减

```typescript
// src/lib/credits.ts
export async function deductCredits(
  userId: string,
  cost: number,
  description: string,
  insightId?: string
): Promise<{ success: boolean; newBalance?: number; reason?: string }>

// 调用 Supabase RPC（数据库原子函数）
const { data } = await supabase.rpc('deduct_credits', {
  p_user_id: userId,
  p_cost: cost,
  p_description: description,
  p_related_insight_id: insightId ?? null,
})
```

## 限流（Upstash Redis）

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  prefix: 'crusher:insights',
})
```

## 核心组件

### LensSelector

```
内置透镜（7 个，图标 + 名称 grid 布局）：
  📋 甲方需求  📝 会议纪要  🔍 需求评审  ⚠️ 风险识别
  📊 变更影响  🐛 问题复盘  📖 技术决策

─── 我的自定义透镜（Day 6 扩展）────────

[+ 创建自定义透镜]（链接到 /lenses）
```

选中后高亮，点击"开始分析"按钮触发 POST /api/insights。

### InsightResult（流式结果卡）

```
┌─────────────────────────────────────────────────────┐
│ [透镜名称 + 图标]    [时间]              [··· 菜单]  │
│ ─────────────────────────────────────────────────── │
│                                                     │
│  Markdown 渲染区（react-markdown + rehype-highlight）│
│  流式打字机效果（useCompletion 流式更新）            │
│                                                     │
│ ─────────────────────────────────────────────────── │
│  消耗 15 积分                     [复制按钮 Day 5]   │
└─────────────────────────────────────────────────────┘
```

`···` 菜单（Day 6 扩展反馈入口）：暂时只有"复制 Markdown"

### 流式输出客户端实现

```typescript
// 使用 Vercel AI SDK useCompletion
const { completion, isLoading, complete } = useCompletion({
  api: '/api/insights',
  body: { documentId, lensType },
  onFinish: (prompt, completion) => {
    // 保存到本地 insights 列表
    // 更新 Zustand credits balance
  },
  onError: (error) => {
    if (error.message.includes('402')) toast.error('积分不足')
    if (error.message.includes('429')) toast.error('操作太频繁，请稍后再试')
  },
})
```

## 文档详情页（Day 4 最终结构）

```
原文（可折叠）

<LensSelector onAnalyze={handleAnalyze} isLoading={isLoading} />

{isLoading && <InsightResult isStreaming completion={completion} />}

{insights.map(insight => (
  <InsightResult key={insight.id} insight={insight} />
))}
```

历史 insights 在页面加载时从 DB 获取（GET /api/insights?documentId=xxx）。

## 验收标准

- [ ] 选择透镜后触发分析，Markdown 内容流式打字机效果显示
- [ ] 积分正确扣减，余额实时更新（Zustand）
- [ ] 积分不足返回 402，前端友好提示
- [ ] 限流生效：20次/分钟/用户，超出返回 429
- [ ] 历史分析结果在详情页正确展示（Markdown 渲染）
- [ ] 7 个内置透镜均可正常触发分析
