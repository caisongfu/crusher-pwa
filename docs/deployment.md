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
│  │ - CDN                            │
│  │ - 自动 HTTPS                      │
│  │ - 全球边缘节点                     │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│  外部服务                          │
│  │ - Supabase (亚太区域）            │
│  │ - DeepSeek API                    │
│  │ - Upstash Redis                   │
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
| `HUPIJIAO_PID` | 虎皮椒支付商户 ID | `your_merchant_id` |
| `HUPIJIAO_KEY` | 虎皮椒支付密钥 | `your_signing_key` |
| `HUPIJIAO_NOTIFY_URL` | 支付回调地址 | `https://your-domain.com/api/payment/webhook` |
| `RESEND_API_KEY` | Resend 邮件 API 密钥 | `re_...` |
| `RESEND_FROM_EMAIL` | 发件邮箱 | `noreply@yourdomain.com` |
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
cp .env.example .env.local
# 编辑 .env.local 填写实际值
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
