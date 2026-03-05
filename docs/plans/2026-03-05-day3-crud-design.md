# Day 3 核心文档 CRUD 设计文档

> 日期：2026-03-05
> 阶段：Day 3 / 9天开发路线图
> 验收标准：能写/读/列出/删除文档

## 目标

实现完整的文档 CRUD 功能，包括文字/语音输入、字数与积分实时预览、文档列表与详情展示、软删除。

## API 路由设计

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/documents` | 创建文档（服务端计算 char_count） |
| GET | `/api/documents` | 文档列表（分页，排除 is_deleted） |
| GET | `/api/documents/[id]` | 文档详情 |
| PATCH | `/api/documents/[id]` | 软删除（is_deleted = true） |

### 入参校验（Zod）

```typescript
// POST /api/documents
const CreateDocumentSchema = z.object({
  title: z.string().max(200).optional(),
  raw_content: z.string().min(1).max(50000),
  source_type: z.enum(['text', 'voice']).default('text'),
})

// GET /api/documents
const ListDocumentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
```

## 组件设计

### CaptureForm（文档输入页核心组件）

```
[文档标题（可选）]  placeholder: "AI 将自动生成摘要标题"

┌─────────────────────────────────────────────────────┐
│  原始内容 textarea                                   │
│  min-height: 200px（PC）/ 160px（Mobile）            │
│  无字数硬限制，超 50,000 字提示截断警告               │
└─────────────────────────────────────────────────────┘
状态栏：[🎙️ 语音] | 4,230 字 | 预消耗 15 积分 | 剩余 85 积分

[提交并分析]  disabled 条件：内容为空 / 积分不足 / 提交中
```

积分不足时：按钮 disabled + "积分不足，请前往充值" + 充值链接

### VoiceButton（语音输入组件）

```typescript
// 使用 Web Speech API
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
recognition.lang = 'zh-CN'
recognition.continuous = true
recognition.interimResults = true  // 实时显示中间结果
```

- 按下开始录音，再按停止（或自动停止后 3s 超时）
- 录音中：按钮变红 + "录音中..."
- 不支持时（Firefox 等）：tooltip 提示"请使用键盘麦克风图标或 Chrome/Safari"
- 结果**追加**到 textarea 现有内容末尾

### DocumentCard（列表卡片）

```
[source_type 图标]  标题（或内容前 50 字）
内容摘要（前 120 字，超出省略）
[透镜 badges]（Day 4 后显示）
创建时间（date-fns 格式化）    [删除按钮]
```

删除：点击后 AlertDialog 确认，确认后软删除并从列表移除（Zustand 本地更新）

### DocumentDetail 页（Day 3 完成基础部分）

```
← 返回列表

[标题]
[原始内容]（可折叠展开，超过 500 字默认折叠）

── AI 分析区（Day 4 填充）────────────────
<LensSelector />（Day 4 实现）
<InsightResult />（Day 4 实现）
```

## 数据流

```
CaptureForm 提交
  → POST /api/documents
  → 服务端：Supabase insert + char_count = content.length
  → 响应：{ id, title }（title 可能是 AI 生成，MVP 先用内容前 20 字）
  → 前端：跳转到 /documents/[id]
  → Zustand documents store prepend 新文档

Home 页初始化
  → GET /api/documents
  → Zustand documents store 赋值
  → 渲染 DocumentCard 列表
```

## Zustand Documents Store

```typescript
// src/store/documents.ts
interface DocumentsStore {
  documents: Document[]
  total: number
  isLoading: boolean
  setDocuments: (docs: Document[], total: number) => void
  prependDocument: (doc: Document) => void
  removeDocument: (id: string) => void
}
```

## 积分预览计算

复用 `src/types/index.ts` 中已定义的 `calculateCreditCost`：

```typescript
// 字数变化时实时计算
const cost = calculateCreditCost(content.length)
const canAfford = (profile?.credits ?? 0) >= cost
```

## 验收标准

- [ ] 能创建文档，跳转到文档详情页
- [ ] 字数/积分预览随输入实时联动，数值准确
- [ ] 文档列表按时间倒序排列
- [ ] 软删除后文档从列表消失，直接访问 URL 返回 404 或权限错误
- [ ] 语音输入在 Chrome 可追加文字到输入框
- [ ] 积分不足时提交按钮禁用，提示明确
