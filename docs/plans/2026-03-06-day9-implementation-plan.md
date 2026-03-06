# Day 9 - 上线部署实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 完成生产环境部署和上线验证，包括 Vercel 部署、域名配置、数据库配置、安全加固、测试验证和监控运维。

**架构：** 使用 Vercel 平台进行部署，Supabase 亚太区域作为数据库，配置自动 HTTPS、Upstash Redis 限流、Google Analytics 监控、邮件告警。

**技术栈：** Vercel、Supabase、HashiCorp Vault、Upstash Redis、Google Analytics、Playwright、Artillery

---

## 前置准备

### Task 1: 创建部署相关目录结构

**Files:**
- Create: `tests/e2e/smoke.spec.ts`
- Create: `tests/e2e/auth.spec.ts`
- Create: `tests/e2e/document.spec.ts`
- Create: `tests/load/insights.yml`
- Create: `tests/load/orders.yml`
- Create: `scripts/deploy.sh`
- Create: `scripts/smoke-test.sh`
- Create: `docs/deployment.md`
- Create: `.env.example.production`

**Step 1: 创建目录结构**

```bash
mkdir -p tests/e2e
mkdir -p tests/load
mkdir -p scripts
```

**Step 2: 验证目录创建**

```bash
tree tests scripts
```

Expected: 显示完整的目录结构

**Step 3: 创建占位文件**

```bash
touch tests/e2e/smoke.spec.ts
touch tests/e2e/auth.spec.ts
touch tests/e2e/document.spec.ts
touch tests/load/insights.yml
touch tests/load/orders.yml
touch scripts/deploy.sh
touch scripts/smoke-test.sh
touch docs/deployment.md
touch .env.example.production
```

**Step 4: 验证文件创建**

```bash
ls -la tests/e2e tests/load scripts docs/
```

Expected: 显示所有创建的文件

**Step 5: 赋予脚本执行权限**

```bash
chmod +x scripts/deploy.sh scripts/smoke-test.sh
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat(day9): create deployment directory structure"
```

---

## 模块一：环境配置

### Task 2: 配置生产环境变量

**Files:**
- Create: `.env.example.production`

**Step 1: 创建生产环境变量模板**

```bash
# .env.example.production

# =============================================
# Supabase
# =============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# =============================================
# DeepSeek API
# =============================================
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# =============================================
# Upstash Redis
# =============================================
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# =============================================
# PayPal
# =============================================
PAYPAL_RECEIVE_LINK=PayPal.Me/SoulfulCai

# =============================================
# 应用配置
# =============================================
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# =============================================
# 管理员邮箱（初始化时使用）
# =============================================
ADMIN_EMAILS=admin@example.com
```

**Step 2: 复制模板创建本地环境变量**

```bash
cp .env.example.production .env.production.local
```

**Step 3: 填写实际环境变量**

编辑 `.env.production.local`，填写实际的 API 密钥和配置信息

**Step 4: 验证环境变量格式**

```bash
# 检查环境变量文件格式
grep -E "^[A-Z_]+=" .env.production.local | head -10
```

Expected: 显示环境变量键名对

**Step 5: Commit**

```bash
git add .env.example.production
git commit -m "feat(day9): add production environment variables template"
```

**注意：** 不要提交 `.env.production.local` 文件到 git

---

### Task 3: 配置 Vercel 项目

**Step 1: 安装 Vercel CLI**

```bash
npm install -g vercel
```

**Step 2: 登录 Vercel**

```bash
vercel login
```

Expected: 浏览器打开 Vercel 登录页面

**Step 3: 链接项目**

```bash
cd /Users/caisongfu/soulful/personal/crusher
vercel link
```

Expected: 项目链接到 Vercel 账户

**Step 4: 创建 Vercel 配置文件**

**Step 1: 编写 Vercel 配置**

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
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "NEXT_PUBLIC_APP_URL": "@app-url"
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_APP_URL": "https://{$VERCEL_URL}"
    }
  }
}
```

**Step 5: 配置 Vercel 环境变量**

在 Vercel Dashboard 中配置环境变量：

1. 访问 https://vercel.com/dashboard
2. 选择项目
3. 进入 Settings → Environment Variables
4. 添加以下环境变量：

| Key | Value | Environment |
|-----|--------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | Production |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | Production |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | Production |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis Token | Production |
| `PAYPAL_RECEIVE_LINK` | PayPal 收款链接 | Production |
| `ADMIN_EMAILS` | 管理员邮箱 | Production |

**Step 6: Commit**

```bash
git add vercel.json
git commit -m "feat(day9): configure Vercel project"
```

---

### Task 4: 配置 Supabase 生产环境

**Step 1: 登录 Supabase CLI**

```bash
npx supabase login
```

Expected: 浏览器打开 Supabase 登录页面

**Step 2: 链接 Supabase 项目**

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

Expected: 项目链接到 Supabase 账户

**Step 3: 运行数据库迁移**

```bash
npx supabase db push
```

Expected: 所有迁移应用到生产数据库

**Step 4: 验证数据库结构**

```bash
npx supabase db remote tables
```

Expected: 显示所有数据库表

**Step 5: 初始化内置 Prompt**

**Step 1: 创建初始化脚本**

```sql
-- supabase/migrations/20260306_day9_init_system_prompts.sql

-- 初始化内置 Prompt（如果不存在）
INSERT INTO system_prompts (lens_type, version, system_prompt, is_active, notes)
VALUES
  ('requirements', 'v1', '你是一位专业的需求分析师。请根据客户沟通记录，整理出完整的需求文档，包括：背景、功能需求列表、验收标准、待确认事项。使用 Markdown 格式输出。', true, '初始版本'),
  ('meeting', 'v1', '你是一位专业的会议记录员。请根据会议记录，整理出标准的会议纪要，包括：会议主题、参与者、议题讨论结论、行动项（含负责人+截止日）。使用 Markdown 格式输出。', true, '初始版本'),
  ('review', 'v1', '你是一位专业的需求评审专家。请对已有的需求文档进行评审，识别出：歧义点、缺失信息、可行性风险、建议补充项。使用 Markdown 格式输出。', true, '初始版本'),
  ('risk', 'v1', '你是一位专业的风险评估专家。请对项目描述或需求文档进行风险识别，包括：技术风险、排期风险、外部依赖风险，并为每个风险提供缓解建议。使用 Markdown 格式输出。', true, '初始版本'),
  ('change', 'v1', '你是一位专业的变更管理专家。请对需求变更描述进行分析，评估影响范围、工作量预估（T恤尺码：S/M/L/XL），并给出建议决策。使用 Markdown 格式输出。', true, '初始版本'),
  ('postmortem', 'v1', '你是一位专业的复盘专家。请根据 Bug 描述或故障记录，进行问题复盘，使用 5Why 方法分析根因，提出改进措施和预防机制。使用 Markdown 格式输出。', true, '初始版本'),
  ('tech', 'v1', '你是一位专业的技术文档专家。请根据技术讨论原文，整理成标准的技术决策记录（ADR）格式，包括：背景、决策、理由、影响。使用 Markdown 格式输出。', true, '初始版本')
ON CONFLICT (lens_type, version) DO NOTHING;
```

**Step 2: 运行初始化迁移**

```bash
npx supabase db push
```

**Step 3: 验证 Prompt 初始化**

```sql
SELECT lens_type, version, is_active FROM system_prompts;
```

Expected: 显示 7 个内置 Prompt，version 为 v1，is_active 为 true

**Step 4: Commit**

```bash
git add supabase/migrations/20260306_day9_init_system_prompts.sql
git commit -m "feat(day9): initialize system prompts"
```

---

### Task 5: 配置管理员账户

**Step 1: 创建管理员账户**

在 Supabase Dashboard 中手动创建管理员账户，或使用以下 SQL：

```sql
-- 创建管理员账户（需要在 Supabase Auth 中先创建用户，然后更新 profile）
-- 这里假设用户已存在，只需要更新 role

-- 方式 1：通过 Supabase Dashboard 创建用户，然后手动更新
-- 访问 Supabase Dashboard → Authentication → Users → Add user

-- 方式 2：使用 SQL 更新（需要用户已通过 Auth 注册）
UPDATE profiles
SET role = 'admin', credits = 10000
WHERE email = 'admin@example.com';
```

**Step 2: 验证管理员账户**

```sql
SELECT email, role, credits FROM profiles WHERE role = 'admin';
```

Expected: 显示管理员账户信息

**Step 3: Commit**

```bash
git add supabase/migrations/20260306_day9_init_admin.sql
git commit -m "feat(day9): initialize admin account"
```

---

## 模块二：部署到 Vercel

### Task 6: 本地构建测试

**Step 1: 安装依赖**

```bash
npm install
```

**Step 2: 构建项目**

```bash
npm run build
```

Expected: 构建成功，无错误

**Step 3: 检查构建输出**

```bash
ls -la .next
```

Expected: 显示 .next 目录内容

**Step 4: 本地测试构建**

```bash
npm start
```

访问 `http://localhost:3000`

Expected: 应用正常运行

**Step 5: 停止本地服务**

```bash
# 按 Ctrl+C 停止
```

---

### Task 7: 部署到 Vercel 预览环境

**Step 1: 创建预览部署**

```bash
vercel
```

Expected: 创建预览部署，返回预览 URL

**Step 2: 访问预览环境**

在浏览器中打开预览 URL

Expected: 应用正常运行

**Step 3: 测试关键功能**

- [ ] 可以访问首页
- [ ] 可以登录
- [ ] 可以创建文档
- [ ] 可以使用 AI 分析
- [ ] 管理后台可以访问

**Step 4: 检查部署日志**

在 Vercel Dashboard 中查看部署日志

Expected: 无错误日志

---

### Task 8: 部署到 Vercel 生产环境

**Step 1: 创建生产部署**

```bash
vercel --prod
```

Expected: 创建生产部署，返回生产 URL

**Step 2: 访问生产环境**

在浏览器中打开生产 URL

Expected: 应用正常运行

**Step 3: 记录生产 URL**

```bash
echo "Production URL: https://your-app.vercel.app" > PRODUCTION_URL.txt
```

**Step 4: Commit**

```bash
git add PRODUCTION_URL.txt
git commit -m "feat(day9): deploy to production environment"
```

---

## 模块三：安全加固

### Task 9: 配置 HTTPS

**Step 1: 验证 HTTPS 配置**

访问生产 URL，检查浏览器地址栏

Expected: 显示 🔒 图标，使用 HTTPS

**Step 2: 检查 SSL 证书**

```bash
curl -I https://your-app.vercel.app
```

Expected: 响应头包含 TLS 信息

**Step 3: 测试 HTTP 到 HTTPS 重定向**

```bash
curl -I http://your-app.vercel.app
```

Expected: 返回 301 或 302 重定向到 HTTPS

---

### Task 10: 配置 MFA

**Step 1: 启用 Supabase MFA**

1. 访问 Supabase Dashboard
2. 进入 Authentication → Providers → Email
3. 启用 Two-Factor Authentication (2FA)
4. 配置 TOTP 或 SMS 2FA

**Step 2: 为管理员账户启用 MFA**

在 Supabase Dashboard 中为管理员账户启用 MFA

**Step 3: 验证 MFA**

尝试使用管理员账户登录，验证 MFA 是否生效

---

### Task 11: 配置访问控制

**Step 1: 配置 IP 白名单（可选）**

如果需要限制管理后台访问，配置 IP 白名单：

```typescript
// src/middleware.ts
const ADMIN_IP_WHITELIST = [
  'your-office-ip-address',
  // 添加更多 IP 地址
];

export function middleware(request: NextRequest) {
  // ... 现有代码

  // 检查管理后台 IP 白名单
  if (pathname.startsWith('/admin') && ADMIN_IP_WHITELIST.length > 0) {
    const ip = request.ip;
    if (!ADMIN_IP_WHITELIST.includes(ip)) {
      return NextResponse.redirect(new URL('/?error=ip_not_allowed', request.url));
    }
  }

  // ... 继续处理
}
```

**Step 2: 测试 IP 白名单**

使用白名单外的 IP 访问管理后台

Expected: 返回 ip_not_allowed 错误

**Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(day9): add admin IP whitelist"
```

---

## 模块四：测试验证

### Task 12: 编写冒烟测试

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`

**Step 1: 安装 Playwright**

```bash
npm install -D @playwright/test
npx playwright install
```

**Step 2: 编写冒烟测试**

```typescript
// tests/e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123456';

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('首页加载', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Crusher');
  });

  test('用户登录', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(`${BASE_URL}/`);
    await expect(page.locator('text=欢迎回来')).toBeVisible();
  });

  test('文档创建', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/`);

    // 创建文档
    await page.click('text=新建文档');
    await page.fill('textarea[name="content"]', '测试文档内容');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=文档创建成功')).toBeVisible();
  });

  test('AI 分析', async ({ page }) => {
    // 先登录并创建文档
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/`);

    await page.click('text=新建文档');
    await page.fill('textarea[name="content"]', '测试文档内容');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/documents\/[^\/]+$/);

    // 选择透镜
    await page.click('[data-testid="lens-selector"]');
    await page.click('text=📋 甲方需求整理');

    // 等待分析结果
    await expect(page.locator('[data-testid="insight-result"]')).toBeVisible({ timeout: 30000 });
  });

  test('管理员登录', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // 访问管理后台
    await page.goto(`${BASE_URL}/admin`);

    await expect(page.locator('h1')).toContainText('用户管理');
  });

  test('限流功能', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/`);

    // 快速创建多个文档（超过限流）
    for (let i = 0; i < 25; i++) {
      await page.click('text=新建文档');
      await page.fill('textarea[name="content"]', `测试文档 ${i}`);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/`);
    }

    // 验证限流提示
    await expect(page.locator('text=请求过于频繁')).toBeVisible();
  });
});
```

**Step 3: 配置 Playwright**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Step 4: 本地运行冒烟测试**

```bash
npx playwright test
```

Expected: 所有测试通过

**Step 5: 查看测试报告**

```bash
npx playwright show-report
```

Expected: 浏览器打开测试报告

**Step 6: Commit**

```bash
git add tests/e2e/ playwright.config.ts
git commit -m "feat(day9): add smoke tests"
```

---

### Task 13: 运行生产环境冒烟测试

**Step 1: 设置环境变量**

```bash
export BASE_URL=https://your-app.vercel.app
export ADMIN_EMAIL=admin@example.com
export ADMIN_PASSWORD=Admin123456
```

**Step 2: 运行测试**

```bash
npx playwright test --project=chromium
```

Expected: 所有测试通过

**Step 3: 查看测试报告**

```bash
npx playwright show-report
```

---

### Task 14: 编写压力测试

**Files:**
- Modify: `tests/load/insights.yml`

**Step 1: 安装 Artillery**

```bash
npm install -g artillery
```

**Step 2: 编写压力测试配置**

```yaml
# tests/load/insights.yml
config:
  target: "https://your-app.vercel.app"
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
  processor: "./tests/load/processor.js"

scenarios:
  - name: "Document Creation"
    flow:
      - post:
          url: "/api/documents"
          json:
            raw_content: "测试文档内容 {{ $randomString() }}"
          headers:
            Authorization: "Bearer {{ $processEnvironment.TOKEN }}"
          capture:
            - json: "$.document.id"
              as: "documentId"
      - think: 1  # 暂停 1 秒

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
            - json: "$"
              as: "insight"
      - think: 2  # 暂停 2 秒
```

**Step 3: 创建处理器**

```javascript
// tests/load/processor.js
module.exports = {
  // 随机字符串生成
  randomString: function (userContext, events, done) {
    const str = Math.random().toString(36).substring(7);
    return done(null, str);
  },
};
```

**Step 4: 本地测试压力测试（使用开发环境）**

```bash
export TOKEN=YOUR_DEV_TOKEN
artillery run tests/load/insights.yml
```

Expected: 测试执行成功，显示性能指标

**Step 5: Commit**

```bash
git add tests/load/
git commit -m "feat(day9): add load tests"
```

---

### Task 15: 运行生产环境压力测试

**Step 1: 获取生产环境 Token**

```bash
# 获取管理员 JWT Token
# 方法：在浏览器开发者工具中登录后，从 localStorage 获取
```

**Step 2: 设置环境变量**

```bash
export TOKEN=YOUR_PROD_TOKEN
```

**Step 3: 运行压力测试**

```bash
artillery run tests/load/insights.yml --output tests/load/results.json
```

Expected: 测试执行完成，生成结果文件

**Step 4: 查看测试结果**

```bash
artillery report tests/load/results.json
```

Expected: 显示性能指标报告

**Step 5: 分析结果**

检查以下指标：
- P95 响应时间
- P99 响应时间
- 错误率
- RPS（每秒请求数）

**目标：**
- P95 响应时间 < 2s
- P99 响应时间 < 5s
- 错误率 < 1%
- RPS > 50

---

## 模块五：监控运维

### Task 16: 配置 Google Analytics

**Step 1: 创建 Google Analytics 账户**

1. 访问 https://analytics.google.com
2. 创建新账户
3. 创建新媒体资源
4. 获取跟踪 ID（格式：G-XXXXXXXXXX）

**Step 2: 配置 Next.js**

```bash
npm install @next/third-parties
```

**Step 3: 添加 Google Analytics 组件**

```typescript
// src/components/google-analytics.tsx
'use client';

import { useEffect } from 'react';
import Script from 'next/script';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function GoogleAnalytics() {
  useEffect(() => {
    // 初始化 Google Analytics
    if (GA_ID) {
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        window.dataLayer.push(arguments);
      }
      gtag('js', new Date());
      gtag('config', GA_ID);
    }
  }, []);

  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}

// 添加 TypeScript 声明
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
```

**Step 4: 在布局中使用**

```typescript
// src/app/layout.tsx
import { GoogleAnalytics } from '@/components/google-analytics';

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

**Step 5: 配置环境变量**

在 `.env.production.local` 中添加：

```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

**Step 6: 部署到生产环境**

```bash
vercel --prod
```

**Step 7: 验证 Google Analytics**

1. 访问生产环境应用
2. 在 Google Analytics Dashboard 中查看实时数据
3. 确认数据正常收集

**Step 8: Commit**

```bash
git add src/components/google-analytics.tsx src/app/layout.tsx
git commit -m "feat(day9): integrate Google Analytics"
```

---

### Task 17: 配置邮件告警

**Step 1: 创建告警组件**

```typescript
// src/lib/alerts.ts
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface AlertData {
  type: 'error' | 'warning' | 'info';
  level: 'P0' | 'P1' | 'P2' | 'P3';
  message: string;
  details?: any;
  userId?: string;
  context?: {
    url?: string;
    userAgent?: string;
    ip?: string;
  };
}

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];

export async function sendAlert(data: AlertData) {
  try {
    // 1. 记录到数据库
    const { error: dbError } = await supabase.from('admin_alerts').insert({
      type: data.type,
      level: data.level,
      message: data.message,
      details: data.details,
      user_id: data.userId,
      context: data.context,
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error('记录告警失败:', dbError);
    }

    // 2. 发送邮件通知管理员
    for (const email of ADMIN_EMAILS) {
      await sendEmailAlert(email, data);
    }

    // 3. 前端显示 toast
    if (typeof window !== 'undefined') {
      const emoji = data.level === 'P0' ? '🚨' : data.level === 'P1' ? '⚠️' : 'ℹ️';
      toast.error(`${emoji} ${data.message}`);
    }
  } catch (error) {
    console.error('发送告警失败:', error);
  }
}

async function sendEmailAlert(email: string, data: AlertData) {
  // 使用 Supabase Edge Function 或第三方邮件服务
  // 这里使用 Supabase Auth 的内置邮件功能（简化方案）

  const subject = `[Crusher ${data.type.toUpperCase()}][${data.level}] ${data.message}`;
  const body = `
告警详情：
- 时间：${new Date().toISOString()}
- 类型：${data.type}
- 级别：${data.level}
- 消息：${data.message}
- 用户 ID：${data.userId || 'N/A'}
- 详情：${JSON.stringify(data.details, null, 2)}

---

此邮件由 Crusher 系统自动发送，请勿回复。
  `.trim();

  // TODO: 实现邮件发送
  // 可以使用 Supabase Edge Function + Resend/SendGrid
  console.log(`发送邮件告警到 ${email}`, { subject, body });
}

// 自动错误捕获
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    sendAlert({
      type: 'error',
      level: 'P2',
      message: `JavaScript 错误: ${event.message}`,
      details: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      },
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    sendAlert({
      type: 'error',
      level: 'P1',
      message: `未处理的 Promise 拒绝: ${event.reason}`,
      details: {
        reason: event.reason,
      },
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    });
  });
}
```

**Step 2: 创建告警表**

```sql
-- supabase/migrations/20260306_day9_admin_alerts.sql

CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('error', 'warning', 'info')),
  level TEXT NOT NULL CHECK (level IN ('P0', 'P1', 'P2', 'P3')),
  message TEXT NOT NULL,
  details JSONB,
  user_id UUID REFERENCES profiles(id),
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_level ON admin_alerts(level);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_at ON admin_alerts(created_at DESC);
```

**Step 3: 运行迁移**

```bash
npx supabase db push
```

**Step 4: 在关键位置使用告警**

```typescript
// 在 API 路由中使用
import { sendAlert } from '@/lib/alerts';

export async function POST(req: NextRequest) {
  try {
    // 业务逻辑
  } catch (error) {
    console.error('API 错误:', error);

    // 发送告警
    await sendAlert({
      type: 'error',
      level: 'P2',
      message: 'API 请求失败',
      details: {
        error: error.message,
        stack: error.stack,
      },
    });

    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
```

**Step 5: Commit**

```bash
git add src/lib/alerts.ts supabase/migrations/20260306_day9_admin_alerts.sql
git commit -m "feat(day9): implement alert system"
```

---

### Task 18: 编写部署文档

**Files:**
- Create: `docs/deployment.md`

**Step 1: 编写部署文档**

```markdown
# Crusher 部署文档

## 概述

Crusher 使用 Vercel 进行部署，Supabase 作为后端服务。

## 部署架构

```
┌─────────────────────────────────────────┐
│  用户浏览器                          │
│  ┌───────────────────────────────────┐  │
│  │ Next.js 应用（Vercel 部署）    │  │
│  │ - Server Components              │  │
│  │ - API Routes                   │  │
│  │ - Static Assets                │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
            ↓ HTTPS
┌─────────────────────────────────────────┐
│  Vercel Edge Network                │
│  - CDN                            │
│  - 自动 HTTPS                      │
│  - 全球边缘节点                     │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│  外部服务                          │
│  - Supabase (亚太区域）            │
│  - DeepSeek API                    │
│  - Upstash Redis                   │
└─────────────────────────────────────────┘
```

## 环境变量配置

### 必需的环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥 | `eyJ...` |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | `sk-...` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | `https://...` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis Token | `AX...` |
| `PAYPAL_RECEIVE_LINK` | PayPal 收款链接 | `PayPal.Me/SoulfulCai` |
| `ADMIN_EMAILS` | 管理员邮箱（逗号分隔） | `admin@example.com` |

### 可选的环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID | `G-XXXXXXXXXX` |
| `NEXT_PUBLIC_APP_URL` | 应用 URL | `https://xxx.vercel.app` |

## 部署步骤

### 1. 准备工作

```bash
# 克隆仓库
git clone https://github.com/your-org/crusher.git
cd crusher

# 安装依赖
npm install

# 配置环境变量
cp .env.example.production .env.production.local
# 编辑 .env.production.local 填写实际值
```

### 2. 数据库配置

```bash
# 登录 Supabase CLI
npx supabase login

# 链接项目
npx supabase link --project-ref YOUR_PROJECT_REF

# 运行迁移
npx supabase db push

# 初始化管理员账户
# 方法 1：在 Supabase Dashboard 中手动创建
# 方法 2：运行 SQL 更新已有用户的 role
```

### 3. Vercel 部署

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login

# 链接项目
vercel link

# 配置环境变量（在 Vercel Dashboard 中配置）
# Settings → Environment Variables

# 部署到预览环境
vercel

# 部署到生产环境
vercel --prod
```

### 4. 验证部署

```bash
# 设置环境变量
export BASE_URL=https://your-app.vercel.app
export ADMIN_EMAIL=admin@example.com
export ADMIN_PASSWORD=Admin123456

# 运行冒烟测试
npx playwright test

# 运行压力测试
export TOKEN=YOUR_JWT_TOKEN
artillery run tests/load/insights.yml
```

## 监控和运维

### 日志查看

**Vercel Logs**
- 访问 Vercel Dashboard
- 进入项目 → Logs
- 实时查看应用日志

**Supabase Logs**
- 访问 Supabase Dashboard
- 进入项目 → Logs
- 查看 Auth、Database、Storage 日志

### 性能监控

**Google Analytics**
- 访问 https://analytics.google.com
- 查看用户行为和性能指标

**Vercel Analytics**
- 在 Vercel Dashboard 中查看
- 自动收集 Web Vitals 指标

### 告警配置

**邮件告警**
- 配置 `ADMIN_EMAILS` 环境变量
- 自动发送 P0/P1 级别告警

**手动查看告警**
```sql
SELECT * FROM admin_alerts
ORDER BY created_at DESC
LIMIT 50;
```

## 故障排查

### 常见问题

**问题 1：部署失败**
```bash
# 检查构建日志
vercel logs

# 本地测试构建
npm run build
```

**问题 2：数据库连接失败**
```bash
# 检查 Supabase URL 和密钥
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# 测试连接
npx supabase status
```

**问题 3：限流触发**
```bash
# 检查 Upstash Redis 配置
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# 重置限流
# 在 Redis 中删除相关 key
```

**问题 4：AI 分析失败**
```bash
# 检查 DeepSeek API 密钥
echo $DEEPSEEK_API_KEY

# 测试 API
curl https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"test"}]}'
```

## 回滚策略

### Vercel 回滚

```bash
# 列出最近的部署
vercel list

# 回滚到特定部署
vercel rollback [deployment-url]

# 或者在 Vercel Dashboard 中点击回滚按钮
```

### 数据库回滚

```bash
# 查看迁移历史
npx supabase migration list

# 回滚到特定迁移
npx supabase migration down [migration-name]
```

## 备份和恢复

### 数据库备份

**自动备份**
- Supabase 每天自动备份
- 保留 7 天

**手动备份**
```bash
# 导出数据库
npx supabase db dump -f backup.sql

# 下载备份文件
# 在 Supabase Dashboard → Database → Backups 中下载
```

### 恢复数据库

```bash
# 导入数据库
npx supabase db reset -f backup.sql

# 或者在 Supabase Dashboard → Database → Restore 中恢复
```

## 安全最佳实践

1. **定期更新依赖**
   ```bash
   npm audit
   npm update
   ```

2. **监控异常**
   - 定期查看告警日志
   - 分析错误模式

3. **备份验证**
   - 定期测试备份恢复
   - 验证数据完整性

4. **限流配置**
   - 根据实际流量调整限流阈值
   - 监控限流触发频率

5. **访问控制**
   - 配置管理后台 IP 白名单
   - 启用 MFA

## 联系方式

- 技术支持：support@crusher.example.com
- 紧急联系：admin@example.com
```

**Step 2: Commit**

```bash
git add docs/deployment.md
git commit -m "feat(day9): add deployment documentation"
```

---

## 模块六：上线检查清单

### Task 19: 执行上线检查清单

**Step 1: 创建检查清单**

```markdown
## Day 9 上线检查清单

### 环境配置
- [ ] 所有环境变量已配置
- [ ] Supabase 项目已创建并配置
- [ ] 数据库迁移已执行
- [ ] 管理员账户已创建
- [ ] Vercel 项目已配置

### 功能验收
- [ ] 用户可以注册
- [ ] 用户可以登录
- [ ] 用户可以创建文档
- [ ] 用户可以使用 AI 分析
- [ ] 用户可以复制 AI 结果
- [ ] 用户可以查看积分余额
- [ ] 用户可以提交反馈
- [ ] 用户可以查看公告
- [ ] 管理员可以访问管理后台
- [ ] 管理员可以查看用户列表
- [ ] 管理员可以操作积分
- [ ] 管理员可以查看订单
- [ ] 管理员可以管理 Prompt
- [ ] 管理员可以管理公告
- [ ] 管理员可以处理反馈

### 安全验收
- [ ] HTTPS 已启用
- [ ] CSRF 防护已配置
- [ ] 限流功能正常工作
- [ ] 未登录用户无法访问受保护页面
- [ ] 非管理员用户无法访问管理后台
- [ ] API Key 未泄露到前端

### 性能验收
- [ ] 首屏加载时间 < 3s
- [ ] API 响应时间 P95 < 2s
- [ ] PWA 缓存正常工作
- [ ] 图片资源已优化

### 监控验收
- [ ] Google Analytics 已配置
- [ ] Vercel Analytics 已配置
- [ ] 邮件告警已配置
- [ ] 日志正常收集

### 测试验收
- [ ] 冒烟测试全部通过
- [ ] 压力测试达到目标
- [ ] 多浏览器测试通过
- [ ] 移动端测试通过

### 文档验收
- [ ] 部署文档已完成
- [ ] API 文档已更新
- [ ] 用户手册已编写
- [ ] 故障排查文档已完成

### 备份验收
- [ ] 数据库备份已验证
- [ ] 回滚流程已测试
- [ ] 恢复流程已测试
```

**Step 2: 逐项检查**

逐项执行检查清单，确认每项都已完成

**Step 3: 记录检查结果**

```bash
# 创建检查结果文件
cat > CHECKLIST_RESULTS.md << 'EOF'
# 上线检查结果

检查日期：$(date +%Y-%m-%d)
检查人员：YOUR_NAME

检查结果：
EOF

# 逐项填写检查结果
```

---

## 验收标准

### 功能验收

- [ ] 所有核心功能正常工作
- [ ] 用户端功能完整
- [ ] 管理后台功能完整
- [ ] 支付功能（如果有）正常

### 性能验收

- [ ] 首屏加载时间 < 3s
- [ ] API 响应时间 P95 < 2s
- [ ] P99 响应时间 < 5s
- [ ] 错误率 < 1%

### 安全验收

- [ ] HTTPS 正常工作
- [ ] CSRF 防护有效
- [ ] 限流功能正常
- [ ] 权限控制正确
- [ ] 无安全漏洞

### 稳定性验收

- [ ] 7 天无重大故障
- [ ] 自动恢复机制正常
- [ ] 备份和恢复测试通过

### 用户体验验收

- [ ] 界面友好
- [ ] 操作流畅
- [ ] 错误提示清晰
- [ ] 响应式设计正常

---

## 总结

Day 9 的实施计划包含完整的生产环境部署和上线验证流程。关键要点：

1. **环境配置**：Vercel + Supabase + Upstash Redis
2. **安全加固**：HTTPS + MFA + CSRF + 访问控制
3. **测试验证**：冒烟测试 + 压力测试 + 手动测试
4. **监控运维**：Google Analytics + Vercel Analytics + 邮件告警
5. **文档完善**：部署文档 + 检查清单 + 故障排查指南
6. **备份恢复**：自动备份 + 手动备份 + 回滚流程

---

**计划完成时间：** 约 6-8 小时
**预计提交次数：** 15+ 次
