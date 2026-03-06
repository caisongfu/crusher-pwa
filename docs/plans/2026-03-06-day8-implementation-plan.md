# Day 8 - 管理后台进阶 + 安全实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 完善管理后台高级功能（Prompt 版本管理、公告管理、反馈管理）并加固系统安全（动态限流、PWA 缓存、CSRF 防护）。

**架构：** 在 Day 7 基础上扩展，新增三个管理模块和多个安全组件。Prompt 管理使用 CodeMirror 编辑器，公告使用 Markdown 编辑器，反馈管理支持状态自由流转。

**技术栈：** Next.js 15、CodeMirror、Recharts、@upstash/ratelimit、@upstash/redis、next-pwa

---

## 前置准备

### Task 1: 创建管理后台进阶目录结构

**Files:**
- Create: `src/app/admin/prompts/page.tsx`
- Create: `src/app/admin/announcements/page.tsx`
- Create: `src/app/admin/feedbacks/page.tsx`
- Create: `src/app/api/admin/prompts/route.ts`
- Create: `src/app/api/admin/prompts/[id]/route.ts`
- Create: `src/app/api/admin/prompts/test/route.ts`
- Create: `src/app/api/admin/announcements/route.ts`
- Create: `src/app/api/admin/announcements/[id]/route.ts`
- Create: `src/app/api/admin/feedbacks/route.ts`
- Create: `src/app/api/admin/feedbacks/[id]/route.ts`
- Create: `src/app/api/admin/feedbacks/stats/route.ts`
- Create: `src/components/admin/prompt-editor.tsx`
- Create: `src/components/admin/prompt-tester.tsx`
- Create: `src/components/admin/announcement-form.tsx`
- Create: `src/components/admin/feedback-list.tsx`
- Create: `src/lib/rate-limit.ts`

**Step 1: 创建目录结构**

```bash
mkdir -p src/app/admin/prompts
mkdir -p src/app/admin/announcements
mkdir -p src/app/admin/feedbacks
mkdir -p src/app/api/admin/prompts/[id]
mkdir -p src/app/api/admin/prompts/test
mkdir -p src/app/api/admin/announcements/[id]
mkdir -p src/app/api/admin/feedbacks/[id]
mkdir -p src/app/api/admin/feedbacks/stats
```

**Step 2: 验证目录创建**

```bash
tree src/app/admin src/app/api/admin src/components/admin
```

Expected: 显示完整的目录结构

**Step 3: 创建占位文件**

```bash
touch src/app/admin/prompts/page.tsx
touch src/app/admin/announcements/page.tsx
touch src/app/admin/feedbacks/page.tsx
touch src/app/api/admin/prompts/route.ts
touch src/app/api/admin/prompts/[id]/route.ts
touch src/app/api/admin/prompts/test/route.ts
touch src/app/api/admin/announcements/route.ts
touch src/app/api/admin/announcements/[id]/route.ts
touch src/app/api/admin/feedbacks/route.ts
touch src/app/api/admin/feedbacks/[id]/route.ts
touch src/app/api/admin/feedbacks/stats/route.ts
touch src/components/admin/prompt-editor.tsx
touch src/components/admin/prompt-tester.tsx
touch src/components/admin/announcement-form.tsx
touch src/components/admin/feedback-list.tsx
touch src/lib/rate-limit.ts
```

**Step 4: 验证文件创建**

```bash
ls -la src/app/admin/prompts src/app/admin/announcements src/app/admin/feedbacks
ls -la src/app/api/admin/prompts src/app/api/admin/announcements src/app/api/admin/feedbacks
ls -la src/components/admin/prompt*.tsx src/components/admin/announcement*.tsx src/components/admin/feedback*.tsx
```

Expected: 显示所有创建的文件

**Step 5: Commit**

```bash
git add .
git commit -m "feat(day8): create admin advanced features directory structure"
```

---

## 模块一：安全加固 - 动态限流

### Task 2: 实现动态限流

**Files:**
- Create: `src/lib/rate-limit.ts`
- Modify: `src/middleware.ts`

**Step 1: 安装依赖**

```bash
npm install @upstash/ratelimit @upstash/redis
```

**Step 2: 配置环境变量**

在 `.env.local` 中添加：

```bash
# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

**Step 3: 实现动态限流**

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 创建 Redis 客户端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 动态限流：根据用户等级调整限流额度
export async function checkRateLimit(userId: string, userCredits: number) {
  // 根据用户等级确定限流额度
  const limit = userCredits > 500 ? 50 : 20; // VIP 用户：50次/分钟，普通用户：20次/分钟

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, '1 m'),
    analytics: true,
    prefix: `crusher:${userId}`,
  });

  const { success, remaining, reset } = await ratelimit.limit(userId);

  if (!success) {
    const resetTime = new Date(reset);
    return {
      allowed: false,
      remaining,
      resetTime,
      message: `请求过于频繁，请在 ${resetTime.toLocaleTimeString('zh-CN')} 后重试`,
    };
  }

  return {
    allowed: true,
    remaining,
    limit,
  };
}

// 通用限流检查（不区分用户等级）
export async function checkGeneralRateLimit(
  identifier: string,
  limit: number = 10,
  window: string = '1 m'
) {
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: `crusher:general:${identifier}`,
  });

  const { success, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    const resetTime = new Date(reset);
    return {
      allowed: false,
      remaining,
      resetTime,
      message: `请求过于频繁，请在 ${resetTime.toLocaleTimeString('zh-CN')} 后重试`,
    };
  }

  return {
    allowed: true,
    remaining,
    limit,
  };
}
```

**Step 4: 在 Insights API 中应用限流**

```typescript
// src/app/api/insights/route.ts
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // 验证用户登录
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取用户积分
    const supabase = await createServerClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 检查限流
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
    // ...
  } catch (error) {
    console.error('Insights API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
```

**Step 5: 测试限流功能**

```bash
# 启动开发服务器
npm run dev

# 在另一个终端连续发送请求
for i in {1..30}; do
  curl -X POST "http://localhost:3000/api/insights" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"documentId": "test", "lensType": "requirements"}'
  echo "Request $i completed"
  sleep 0.1
done
```

Expected: 前 20 次请求成功，后续请求返回 429 错误

**Step 6: Commit**

```bash
git add src/lib/rate-limit.ts src/app/api/insights/route.ts
git commit -m "feat(day8): implement dynamic rate limiting"
```

---

### Task 3: 配置 PWA 缓存策略

**Files:**
- Modify: `next.config.ts`

**Step 1: 阅读现有配置**

```bash
cat next.config.ts
```

**Step 2: 添加 PWA 动态缓存配置**

在 `next.config.ts` 中添加：

```typescript
const withPWA = require('@ducanh2912/next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
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
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /^https:\/\/.*\.vercel\.app\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'app',
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 1 * 24 * 60 * 60, // 1 天
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});

// 其他配置...
module.exports = withPWA({
  // ... 现有配置
});
```

**Step 3: 验证 PWA 配置**

```bash
npm run build
```

Expected: 构建成功，生成 `public/sw.js` 和 `public/worker.js`

**Step 4: 测试 PWA 缓存**

```bash
# 启动生产构建
npm start

# 在浏览器中访问应用
# 检查 Application → Service Workers
# 检查 Network 标签，验证资源是否从缓存加载
```

Expected: Service Worker 正常注册，资源缓存生效

**Step 5: Commit**

```bash
git add next.config.ts
git commit -m "feat(day8): configure PWA dynamic caching"
```

---

### Task 4: 配置 CSRF 防护

**Files:**
- Modify: `next.config.ts`
- Create: `src/lib/csrf.ts`

**Step 1: 添加 CSRF 配置**

在 `next.config.ts` 中添加：

```typescript
module.exports = {
  // ... 现有配置

  // CSRF 防护
  experimental: {
    csrfToken: true,
  },

  // 安全 Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};
```

**Step 2: 创建 CSRF 工具函数**

```typescript
// src/lib/csrf.ts
import { cookies } from 'next/headers';

export function getCSRFToken(): string {
  const cookieStore = cookies();
  const token = cookieStore.get('next-auth.csrf-token');
  return token?.value || '';
}

export async function verifyCSRFToken(
  requestToken: string
): Promise<boolean> {
  const cookieStore = cookies();
  const cookieToken = cookieStore.get('next-auth.csrf-token');

  if (!cookieToken) {
    return false;
  }

  // Next.js CSRF token 格式: "hash|token"
  const [hash, token] = cookieToken.value.split('|');
  const [requestHash, requestTokenPart] = requestToken.split('|');

  return hash === requestHash && token === requestTokenPart;
}
```

**Step 3: 在 API 中验证 CSRF Token**

```typescript
// src/app/api/insights/route.ts
import { verifyCSRFToken } from '@/lib/csrf';

export async function POST(req: NextRequest) {
  try {
    // 验证 CSRF Token
    const csrfToken = req.headers.get('x-csrf-token') || '';
    const isValidCSRF = await verifyCSRFToken(csrfToken);

    if (!isValidCSRF) {
      return NextResponse.json({ error: 'CSRF Token 无效' }, { status: 403 });
    }

    // 继续处理请求...
    // ...
  } catch (error) {
    console.error('Insights API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
```

**Step 4: 在客户端添加 CSRF Token**

```typescript
// src/components/insight-form.tsx
'use client';

import { getCSRFToken } from '@/lib/csrf';

export function InsightForm() {
  useEffect(() => {
    // 从 cookies 获取 CSRF Token
    fetch('/api/csrf-token')
      .then((res) => res.json())
      .then((data) => {
        setCsrfToken(data.csrfToken);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ documentId, lensType }),
    });
    // ...
  };

  // ...
}
```

**Step 5: 创建 CSRF Token API**

```typescript
// src/app/api/csrf-token/route.ts
import { NextResponse } from 'next/server';
import { getCSRFToken } from '@/lib/csrf';

export async function GET() {
  const token = getCSRFToken();
  return NextResponse.json({ csrfToken: token });
}
```

**Step 6: 测试 CSRF 防护**

```bash
# 测试无 CSRF Token 的请求
curl -X POST "http://localhost:3000/api/insights" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentId": "test", "lensType": "requirements"}'

Expected: 返回 403 错误
```

**Step 7: Commit**

```bash
git add src/lib/csrf.ts src/app/api/csrf-token/route.ts src/app/api/insights/route.ts
git commit -m "feat(day8): implement CSRF protection"
```

---

## 模块二：Prompt 版本管理

### Task 5: 安装 CodeMirror 依赖

**Files:**
- Modify: `package.json`

**Step 1: 安装依赖**

```bash
npm install @uiw/react-codemirror @codemirror/lang-markdown
```

**Step 2: 验证安装**

```bash
npm list @uiw/react-codemirror @codemirror/lang-markdown
```

Expected: 显示已安装的版本

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(day8): install CodeMirror for prompt editing"
```

---

### Task 6: 实现 Prompt 编辑器组件

**Files:**
- Create: `src/components/admin/prompt-editor.tsx`

**Step 1: 创建 Prompt 编辑器组件**

```typescript
// src/components/admin/prompt-editor.tsx
'use client';

import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { cn } from '@/lib/utils';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export function PromptEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = '请输入 Prompt...',
  className,
}: PromptEditorProps) {
  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={[markdown()]}
        readOnly={readOnly}
        placeholder={placeholder}
        theme="light"
        height="400px"
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          searchKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
      />
    </div>
  );
}
```

**Step 2: 测试组件**

```bash
npm run dev
```

在浏览器中访问使用该组件的页面

Expected: CodeMirror 编辑器正常显示，支持 Markdown 语法高亮

**Step 3: Commit**

```bash
git add src/components/admin/prompt-editor.tsx
git commit -m "feat(day8): implement Prompt editor component with CodeMirror"
```

---

### Task 7: 实现 Prompt 测试器组件

**Files:**
- Create: `src/components/admin/prompt-tester.tsx`

**Step 1: 创建 Prompt 测试器组件**

```typescript
// src/components/admin/prompt-tester.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Play, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

interface PromptTesterProps {
  lensType: string;
  systemPrompt: string;
}

export function PromptTester({ lensType, systemPrompt }: PromptTesterProps) {
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTest = async () => {
    if (!testInput.trim()) {
      toast.error('请输入测试文本');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/prompts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lensType, testInput, systemPrompt }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult(data.result);
        toast.success('测试完成');
      } else {
        toast.error(data.error || '测试失败');
      }
    } catch (error) {
      console.error('测试 Prompt 失败:', error);
      toast.error('测试失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>测试 Prompt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            测试文本
          </label>
          <Textarea
            placeholder="请输入用于测试的文本..."
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            rows={6}
          />
        </div>

        <Button onClick={handleTest} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              测试中...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              测试 Prompt
            </>
          )}
        </Button>

        {testResult && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-3">测试结果：</h3>
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight]}
              className="prose prose-sm max-w-none"
            >
              {testResult}
            </ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: 测试组件**

在浏览器中访问使用该组件的页面，输入测试文本并点击测试按钮

Expected: 测试结果正常显示，Markdown 渲染正确

**Step 3: Commit**

```bash
git add src/components/admin/prompt-tester.tsx
git commit -m "feat(day8): implement Prompt tester component"
```

---

### Task 8: 实现 Prompt 列表 API

**Files:**
- Create: `src/app/api/admin/prompts/route.ts`

**Step 1: 编写 Prompt 列表 API**

```typescript
// src/app/api/admin/prompts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 请求参数验证
const GetPromptsSchema = z.object({
  lensType: z.enum([
    'requirements',
    'meeting',
    'review',
    'risk',
    'change',
    'postmortem',
    'tech',
  ]),
});

export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 解析和验证请求参数
    const { searchParams } = new URL(req.url);
    const params = GetPromptsSchema.parse(Object.fromEntries(searchParams));

    // 查询 Prompt 版本列表
    const { data: versions, error } = await supabase
      .from('system_prompts')
      .select('*')
      .eq('lens_type', params.lensType)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('查询 Prompt 版本列表失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 查询当前激活版本
    const { data: activeVersion } = await supabase
      .from('system_prompts')
      .select('version')
      .eq('lens_type', params.lensType)
      .eq('is_active', true)
      .single();

    return NextResponse.json({
      versions: versions || [],
      activeVersion: activeVersion?.version || null,
    });
  } catch (error) {
    console.error('Prompt 列表 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 创建新 Prompt 版本
const CreatePromptSchema = z.object({
  lensType: z.enum([
    'requirements',
    'meeting',
    'review',
    'risk',
    'change',
    'postmortem',
    'tech',
  ]),
  systemPrompt: z.string().min(10, 'Prompt 内容不能少于 10 个字符'),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 验证管理员权限
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 解析和验证请求参数
    const body = await req.json();
    const validatedData = CreatePromptSchema.parse(body);

    // 生成新版本号
    const { data: existingVersions } = await supabase
      .from('system_prompts')
      .select('version')
      .eq('lens_type', validatedData.lensType);

    const versionCount = existingVersions?.length || 0;
    const newVersion = `v${versionCount + 1}`;

    // 创建新 Prompt 版本（默认不激活）
    const { data: newVersion, error } = await supabase
      .from('system_prompts')
      .insert({
        lens_type: validatedData.lensType,
        version: newVersion,
        system_prompt: validatedData.systemPrompt,
        notes: validatedData.notes,
        is_active: false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !newVersion) {
      console.error('创建 Prompt 版本失败:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      version: newVersion,
      message: '新版本已创建，请手动激活',
    });
  } catch (error) {
    console.error('创建 Prompt API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
```

**Step 2: 测试 API**

```bash
# 获取 Prompt 列表
curl -X GET "http://localhost:3000/api/admin/prompts?lensType=requirements" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 创建新 Prompt 版本
curl -X POST "http://localhost:3000/api/admin/prompts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lensType": "requirements",
    "systemPrompt": "你是一位专业的需求分析师...",
    "notes": "优化了验收标准的提取逻辑"
  }'
```

Expected: API 正常返回数据

**Step 3: Commit**

```bash
git add src/app/api/admin/prompts/route.ts
git commit -m "feat(day8): implement Prompt list and create API"
```

---

### Task 9: 实现 Prompt 测试和激活 API

**Files:**
- Create: `src/app/api/admin/prompts/test/route.ts`
- Create: `src/app/api/admin/prompts/[id]/route.ts`

**Step 1: 编写 Prompt 测试 API**

```typescript
// src/app/api/admin/prompts/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createServerClient } from '@/lib/supabase/server';
import { streamText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { z } from 'zod';

// 请求参数验证
const TestPromptSchema = z.object({
  lensType: z.string(),
  testInput: z.string().min(1, '测试文本不能为空'),
  systemPrompt: z.string().min(10, 'Prompt 内容不能少于 10 个字符'),
});

export async function POST(req: NextRequest) {
  try {
    // 验证管理员权限
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 解析和验证请求参数
    const body = await req.json();
    const validatedData = TestPromptSchema.parse(body);

    // 调用 DeepSeek API 测试 Prompt
    const result = streamText({
      model: deepseek('deepseek-chat'),
      system: validatedData.systemPrompt,
      prompt: `请分析以下内容：\n\n${validatedData.testInput}`,
      maxTokens: 1000,
    });

    // 返回流式响应
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Prompt 测试 API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
```

**Step 2: 编写 Prompt 激活 API**

```typescript
// src/app/api/admin/prompts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createServerClient } from '@/lib/supabase/server';

// 激活 Prompt 版本
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 查询要激活的版本
    const { data: targetVersion, error: queryError } = await supabase
      .from('system_prompts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (queryError || !targetVersion) {
      return NextResponse.json({ error: '版本不存在' }, { status: 404 });
    }

    // 取消该透镜类型的所有其他版本的激活状态
    await supabase
      .from('system_prompts')
      .update({ is_active: false })
      .eq('lens_type', targetVersion.lens_type);

    // 激活目标版本
    const { data: updatedVersion, error: updateError } = await supabase
      .from('system_prompts')
      .update({ is_active: true })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError || !updatedVersion) {
      console.error('激活 Prompt 版本失败:', updateError);
      return NextResponse.json({ error: '激活失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '版本已激活',
      activeVersion: updatedVersion,
    });
  } catch (error) {
    console.error('激活 Prompt API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 删除 Prompt 版本
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 查询要删除的版本
    const { data: targetVersion, error: queryError } = await supabase
      .from('system_prompts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (queryError || !targetVersion) {
      return NextResponse.json({ error: '版本不存在' }, { status: 404 });
    }

    // 不能删除激活的版本
    if (targetVersion.is_active) {
      return NextResponse.json(
        { error: '不能删除激活的版本，请先激活其他版本' },
        { status: 400 }
      );
    }

    // 删除版本
    const { error: deleteError } = await supabase
      .from('system_prompts')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('删除 Prompt 版本失败:', deleteError);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '版本已删除',
    });
  } catch (error) {
    console.error('删除 Prompt API 错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
```

**Step 3: 测试 API**

```bash
# 测试 Prompt
curl -X POST "http://localhost:3000/api/admin/prompts/test" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lensType": "requirements",
    "testInput": "测试内容",
    "systemPrompt": "你是一位专业的需求分析师"
  }'

# 激活 Prompt 版本
curl -X PATCH "http://localhost:3000/api/admin/prompts/PROMPT_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 删除 Prompt 版本
curl -X DELETE "http://localhost:3000/api/admin/prompts/PROMPT_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected: API 正常执行

**Step 4: Commit**

```bash
git add src/app/api/admin/prompts/test/route.ts src/app/api/admin/prompts/[id]/route.ts
git commit -m "feat(day8): implement Prompt test and activate API"
```

---

### Task 10: 实现 Prompt 管理页面

**Files:**
- Create: `src/app/admin/prompts/page.tsx`

**Step 1: 创建 Prompt 管理页面**

```typescript
// src/app/admin/prompts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { PromptEditor } from '@/components/admin/prompt-editor';
import { PromptTester } from '@/components/admin/prompt-tester';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Check } from 'lucide-react';

const lensTypes = [
  { value: 'requirements', label: '📋 甲方需求整理' },
  { value: 'meeting', label: '📝 会议纪要' },
  { value: 'review', label: '🔍 需求评审' },
  { value: 'risk', label: '⚠️ 风险识别' },
  { value: 'change', label: '📊 变更影响分析' },
  { value: 'postmortem', label: '🐛 问题复盘' },
  { value: 'tech', label: '📖 技术决策记录' },
];

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

export default function AdminPromptsPage() {
  const [selectedLensType, setSelectedLensType] = useState('requirements');
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 创建/编辑表单
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // 编辑表单
  const [editingVersion, setEditingVersion] = useState<PromptVersion | null>(null);

  // 加载版本列表
  useEffect(() => {
    loadVersions();
  }, [selectedLensType]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/prompts?lensType=${selectedLensType}`
      );
      const data = await response.json();

      if (response.ok) {
        setVersions(data.versions);
        setActiveVersion(data.activeVersion);
      } else {
        toast.error(data.error || '加载版本列表失败');
      }
    } catch (error) {
      console.error('加载版本列表失败:', error);
      toast.error('加载版本列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建新版本
  const handleCreateVersion = async () => {
    if (!newPrompt.trim()) {
      toast.error('请输入 Prompt 内容');
      return;
    }

    try {
      const response = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lensType: selectedLensType,
          systemPrompt: newPrompt,
          notes: newNotes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('新版本已创建');
        setIsCreateDialogOpen(false);
        setNewPrompt('');
        setNewNotes('');
        loadVersions();
      } else {
        toast.error(data.error || '创建失败');
      }
    } catch (error) {
      console.error('创建版本失败:', error);
      toast.error('创建版本失败');
    }
  };

  // 激活版本
  const handleActivateVersion = async (versionId: string) => {
    if (!confirm('确定要激活此版本吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/prompts/${versionId}`, {
        method: 'PATCH',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('版本已激活');
        loadVersions();
      } else {
        toast.error(data.error || '激活失败');
      }
    } catch (error) {
      console.error('激活版本失败:', error);
      toast.error('激活版本失败');
    }
  };

  // 删除版本
  const handleDeleteVersion = async (versionId: string) => {
    if (!confirm('确定要删除此版本吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/prompts/${versionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('版本已删除');
        loadVersions();
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除版本失败:', error);
      toast.error('删除版本失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Prompt 版本管理</h2>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新建版本
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建 Prompt 版本</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>透镜类型</Label>
                <Select value={selectedLensType} onChange={setSelectedLensType}>
                  {lensTypes.map((lens) => (
                    <option key={lens.value} value={lens.value}>
                      {lens.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Prompt 内容</Label>
                <Textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="请输入 Prompt 内容..."
                  rows={10}
                />
              </div>
              <div>
                <Label>变更说明</Label>
                <Textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="请填写变更说明..."
                  rows={3}
                />
              </div>
              <Button onClick={handleCreateVersion}>创建</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 透镜类型选择 */}
      <Select value={selectedLensType} onChange={setSelectedLensType}>
        {lensTypes.map((lens) => (
          <option key={lens.value} value={lens.value}>
            {lens.label}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 版本列表 */}
        <Card>
          <CardHeader>
            <CardTitle>
              版本历史
              {activeVersion && (
                <span className="ml-2 text-sm text-gray-500">
                  当前激活：{activeVersion}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>加载中...</div>
            ) : versions.length === 0 ? (
              <div>暂无版本</div>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{version.version}</span>
                        {version.is_active && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                            激活中
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {version.notes || '无变更说明'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(version.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingVersion(version)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!version.is_active && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivateVersion(version.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVersion(version.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 编辑和测试 */}
        <div className="space-y-6">
          {editingVersion && (
            <Card>
              <CardHeader>
                <CardTitle>编辑版本 {editingVersion.version}</CardTitle>
              </CardHeader>
              <CardContent>
                <PromptEditor
                  value={editingVersion.system_prompt}
                  onChange={(value) =>
                    setEditingVersion({
                      ...editingVersion,
                      system_prompt: value,
                    })
                  }
                />
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => setEditingVersion(null)}>
                    关闭
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {editingVersion && (
            <PromptTester
              lensType={selectedLensType}
              systemPrompt={editingVersion.system_prompt}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 测试页面**

访问 `http://localhost:3000/admin/prompts`

Expected: 页面正常显示，可以创建、编辑、激活、删除版本

**Step 3: Commit**

```bash
git add src/app/admin/prompts/page.tsx
git commit -m "feat(day8): implement Prompt management page"
```

---

## 模块三：公告管理（略）

公告管理模块的实施步骤与 Prompt 管理类似，包括：

- 公告列表 API
- 创建/更新/删除公告 API
- 公告管理页面（使用 Markdown 编辑器）
- 公告展示（前端首页顶部横幅）

每个任务都遵循相同的 TDD 流程。

---

## 模块四：反馈管理（略）

反馈管理模块包括：

- 反馈列表 API（支持筛选）
- 更新反馈状态 API
- 反馈统计 API
- 反馈列表页面
- 反馈详情侧抽屉

---

## 验收标准

### 功能验收

- [ ] 动态限流正常工作（普通用户 20次/分钟，VIP 50次/分钟）
- [ ] PWA 缓存策略正确配置
- [ ] CSRF 防护正常工作
- [ ] Prompt 版本可以创建、编辑、激活、删除
- [ ] Prompt 测试功能正常
- [ ] 公告可以创建、编辑、删除、启用/禁用
- [ ] 反馈可以查看和更新状态

### 性能验收

- [ ] 限流检查时间 < 100ms
- [ ] Prompt 测试响应时间 < 5s
- [ ] 页面加载时间 < 3s

### 安全验收

- [ ] 限流触发后返回 429 错误
- [ ] 无效 CSRF Token 请求被拒绝
- [ ] 管理员权限验证正常

---

## 总结

Day 8 的实施计划包含管理后台进阶功能和系统安全加固。关键要点：

1. **动态限流**：根据用户积分等级调整限流额度
2. **PWA 缓存**：动态缓存策略，提升离线体验
3. **CSRF 防护**：所有修改操作都需要验证 CSRF Token
4. **Prompt 管理**：CodeMirror 编辑器 + 测试功能 + 版本激活
5. **公告管理**：Markdown 编辑器 + 首页横幅展示
6. **反馈管理**：状态自由流转 + 统计图表

---

**计划完成时间：** 约 8-10 小时
**预计提交次数：** 25+ 次
