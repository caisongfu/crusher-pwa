# 碎石记 · Crusher

> AI 驱动的文档多维分析平台 —— 用多种「透镜」解析你的每一份文档

---

## 简介

**碎石记（Crusher）** 是一款基于 Next.js 的 AI 文档分析工具。你可以将任意文本内容投入平台，选择不同的「分析透镜」，让 AI 从需求梳理、会议纪要、代码评审、风险识别等多个维度为你提炼洞察。

### 核心理念

一份文档，多种视角。通过可自定义的透镜体系，碎石记让 AI 分析不再是「黑盒输出」，而是你主动选择的分析框架。

---

## 功能特性

### 文档管理
- 文本输入创建文档，支持字数统计
- 文档列表浏览与详情查看
- 软删除机制，数据安全

### AI 分析透镜
| 透镜类型 | 用途 |
|----------|------|
| `requirements` | 需求梳理分析 |
| `meeting` | 会议纪要提炼 |
| `review` | 代码 / 文档评审 |
| `risk` | 风险识别评估 |
| `change` | 变更影响分析 |
| `postmortem` | 故障复盘总结 |
| `tech` | 技术文档解析 |
| `custom` | 用户自定义透镜 |

### 积分体系
| 套餐 | 积分 | 价格 |
|------|------|------|
| 入门包 | 100 积分 | ¥10 |
| 标准包 | 500 积分 | ¥45 |
| 专业包 | 1200 积分 | ¥96 |

**分析消耗规则：**
- ≤ 3,000 字：10 积分
- ≤ 6,000 字：15 积分
- ≤ 10,000 字：22 积分
- > 10,000 字：22 + ⌈(字数 - 10000) / 1000⌉ × 5 积分

### 其他功能
- 响应式设计：PC 侧边栏 + 移动端底部导航
- PWA 支持，可安装到主屏幕
- 用户注册 / 登录（邮箱 + 密码）
- 自定义透镜创建与管理
- 管理员后台（用户管理、订单、公告、Prompt 管理）
- 系统公告横幅
- 用户反馈提交

---

## 技术栈

| 分类 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 15.2.4 |
| UI 库 | React | 19.1.0 |
| 语言 | TypeScript | 5 |
| 样式 | Tailwind CSS | 3.4.19 |
| UI 组件 | Radix UI | ^1.1.11 |
| 动画 | Framer Motion | 11.18.0 |
| 后端服务 | Supabase (Auth + DB) | 2.49.1 |
| 状态管理 | Zustand | 5.0.3 |
| AI 提供商 | DeepSeek API | - |
| 支付 | 虎皮椒（Hupijiao） | - |
| 表单验证 | react-hook-form + Zod | 7.71.2 / 3.25 |
| 通知 | Sonner | 1.7.4 |
| 图标 | Lucide React | 0.469.0 |
| PWA | @ducanh2912/next-pwa | 10.2.9 |

---

## 项目结构

```
crusher/
├── src/
│   ├── app/
│   │   ├── (auth)/          # 登录 / 注册页面（无需鉴权）
│   │   ├── (main)/          # 主应用页面（需要登录）
│   │   │   ├── capture/     # 文档创建
│   │   │   ├── documents/   # 文档列表与详情
│   │   │   ├── lenses/      # 透镜管理
│   │   │   └── profile/     # 个人中心与充值
│   │   ├── admin/           # 管理员后台
│   │   └── api/             # API 路由
│   ├── components/
│   │   ├── layout/          # 布局组件（Sidebar / BottomNav / TopBar）
│   │   └── ui/              # 通用 UI 组件（基于 Radix UI）
│   ├── lib/
│   │   ├── supabase/        # Supabase 客户端配置
│   │   └── prompts/         # AI Prompt 模板
│   ├── store/               # Zustand 状态管理
│   ├── types/               # TypeScript 类型定义
│   └── middleware.ts        # 路由鉴权中间件
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 并填写对应值：

```bash
cp .env.example .env.local
```

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# DeepSeek LLM
DEEPSEEK_API_KEY=sk-...

# 虎皮椒支付
HUPIJIAO_PID=your_merchant_id
HUPIJIAO_KEY=your_signing_key
HUPIJIAO_NOTIFY_URL=https://your-domain.com/api/payment/webhook

# Upstash Redis（限流）
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# 应用地址
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 构建生产版本

```bash
npm run build
npm start
```

---

## 数据库结构

核心数据表（使用 Supabase PostgreSQL）：

| 表名 | 说明 |
|------|------|
| `profiles` | 用户档案（角色、积分） |
| `documents` | 用户文档 |
| `custom_lenses` | 自定义透镜 |
| `insights` | AI 分析结果 |
| `credit_transactions` | 积分流水记录 |
| `payment_orders` | 支付订单 |
| `feedbacks` | 用户反馈 |
| `system_prompts` | AI Prompt 版本管理 |
| `announcements` | 系统公告 |

---

## 认证与权限

- **中间件层**（`src/middleware.ts`）：JWT 验证、路由保护、管理员角色校验
- **公开路由**：`/login`、`/register`
- **支付回调**：`/api/payment/webhook`（绕过鉴权）
- **管理员路由**：`/admin`（需要 `role = 'admin'`）

---

## 部署

平台支持部署至 Vercel、Netlify 或任何 Node.js 环境。

```bash
npm run build
```

**PWA 注意事项：**
- 生产环境需启用 HTTPS（Service Worker 要求）
- 开发环境下 PWA 自动禁用

---

## 开发规范

- 组件按 Server / Client 职责拆分，Server Component 优先
- 表单使用 `react-hook-form + Zod` 做类型安全校验
- 错误提示统一使用 `Sonner` toast
- 响应式：移动端样式优先，PC 端用 `md:` 前缀覆盖
- 数据库操作需处理 Supabase error，禁止静默吞错

---

## License

Private — All rights reserved.
