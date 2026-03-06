# HTTPS 配置指南

## 概述

Crusher 项目使用 Vercel 进行部署，Vercel 自动为所有部署提供 HTTPS 证书。本文档详细说明 HTTPS 配置和验证方法。

## Vercel HTTPS 配置

### 自动 HTTPS

Vercel 为所有部署自动提供 HTTPS 证书：

- **.vercel.app 域名**：自动配置，无需手动操作
- **自定义域名**：在 Vercel Dashboard 中配置后自动颁发证书

### 安全头配置

项目已在 `next.config.ts` 中配置了安全头：

```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'microphone=(self)' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "connect-src 'self' https://*.supabase.co https://api.deepseek.com https://api.hupijiao.com",
          ].join('; '),
        },
      ],
    },
  ];
},
```

### 安全头说明

| 安全头 | 作用 | 当前值 |
|--------|------|--------|
| X-Frame-Options | 防止点击劫持 | DENY |
| X-Content-Type-Options | 防止 MIME 类型嗅探 | nosniff |
| X-DNS-Prefetch-Control | 控制 DNS 预取 | on |
| Referrer-Policy | 控制 Referrer 信息泄露 | strict-origin-when-cross-origin |
| Permissions-Policy | 限制浏览器 API | microphone=(self) |
| Content-Security-Policy | 防止 XSS 攻击 | 限制资源来源 |

## 验证 HTTPS

### 方法 1: 使用验证脚本

```bash
# 本地开发环境
bash scripts/verify-https.sh

# 生产环境
export APP_URL=https://your-app.vercel.app
bash scripts/verify-https.sh
```

### 方法 2: 手动验证

```bash
# 检查 HTTPS 连接
curl -I https://your-app.vercel.app

# 检查 HTTP 到 HTTPS 重定向
curl -I http://your-app.vercel.app
# 应返回 301/302/307/308 重定向

# 检查 SSL 证书
openssl s_client -connect your-app.vercel.app:443 -servername your-app.vercel.app
```

### 方法 3: 浏览器验证

1. 访问 `https://your-app.vercel.app`
2. 检查地址栏是否显示 🔒 图标
3. 点击 🔒 图标查看证书信息

## Vercel 自定义域名 HTTPS

### 配置步骤

1. **添加自定义域名**
   ```bash
   # 在 Vercel Dashboard 中
   Settings → Domains → Add Domain
   ```

2. **配置 DNS 记录**
   - 类型: CNAME
   - 名称: your-domain.com
   - 值: cname.vercel-dns.com

3. **等待 SSL 证书颁发**
   - Vercel 自动申请 Let's Encrypt 证书
   - 通常在 1-5 分钟内完成

4. **验证 HTTPS**
   ```bash
   curl -I https://your-domain.com
   ```

### 证书自动更新

Vercel 使用 Let's Encrypt 提供的免费证书，并在到期前自动更新：

- 证书有效期：90 天
- 自动续期：证书到期前 30 天自动续期
- 无需手动干预

## TLS 配置

### 支持的 TLS 版本

Vercel 支持以下 TLS 版本：

- TLS 1.2 (推荐)
- TLS 1.3

验证 TLS 版本：

```bash
# 检查 TLS 1.2
openssl s_client -connect your-app.vercel.app:443 -tls1_2

# 检查 TLS 1.3
openssl s_client -connect your-app.vercel.app:443 -tls1_3
```

### 禁用的 TLS 版本

Vercel 自动禁用以下不安全的 TLS 版本：

- SSL 2.0
- SSL 3.0
- TLS 1.0
- TLS 1.1

## 常见问题

### 问题 1: 本地开发环境无法使用 HTTPS

**现象**：本地 `http://localhost:3000` 不支持 HTTPS

**原因**：开发环境使用 HTTP，生产环境才使用 HTTPS

**解决方案**：
- 生产环境部署到 Vercel 后自动启用 HTTPS
- 如需本地测试 HTTPS，可使用 ngrok 等工具

### 问题 2: 自定义域名 HTTPS 证书未生效

**现象**：自定义域名显示不安全警告

**解决方案**：
1. 检查 DNS 配置是否正确
2. 等待 DNS 传播 (最长 24 小时)
3. 在 Vercel Dashboard 中查看证书状态
4. 如有问题，删除域名后重新添加

### 问题 3: HTTP 到 HTTPS 重定向不工作

**现象**：访问 `http://your-app.vercel.app` 未重定向到 HTTPS

**解决方案**：
Vercel 自动处理 HTTP 到 HTTPS 重定向，无需额外配置。如仍有问题：

1. 检查 Vercel Dashboard 中的域名配置
2. 清除浏览器缓存
3. 使用无痕模式测试

### 问题 4: CSP 错误导致资源加载失败

**现象**：控制台显示 Content-Security-Policy 错误

**解决方案**：
1. 检查 `next.config.ts` 中的 CSP 配置
2. 将缺少的域名添加到 `connect-src` 或 `script-src`
3. 测试时使用 `report-only` 模式：

```typescript
{
  key: 'Content-Security-Policy-Report-Only',
  value: "your-csp-policy"
}
```

## HTTPS 最佳实践

### 1. 始终使用 HTTPS

- 所有生产环境流量必须使用 HTTPS
- 不要在代码中硬编码 HTTP URL
- 使用相对路径或协议相对 URL (`//example.com`)

### 2. 强制 HTTPS

Vercel 自动强制 HTTPS，但也可以在代码中添加：

```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto');
  if (protocol !== 'https') {
    return NextResponse.redirect(
      `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
      301
    );
  }
}
```

### 3. HSTS (HTTP Strict Transport Security)

在 `next.config.ts` 中添加 HSTS 头：

```typescript
{
  key: 'Strict-Transport-Security',
  value: 'max-age=31536000; includeSubDomains'
}
```

### 4. 监控 SSL 证书

定期检查 SSL 证书状态：

```bash
# 检查证书有效期
echo | openssl s_client -connect your-app.vercel.app:443 2>/dev/null | openssl x509 -noout -dates
```

### 5. 使用安全的加密套件

Vercel 自动配置安全的加密套件，无需手动配置。

## 测试命令

```bash
# 完整的 HTTPS 测试
bash scripts/verify-https.sh

# SSL Labs 测试（在线工具）
# 访问：https://www.ssllabs.com/ssltest/analyze.html?d=your-app.vercel.app

# 检查混合内容
curl -I https://your-app.vercel.app | grep -i "content-security-policy"

# 检查 HSTS
curl -I https://your-app.vercel.app | grep -i "strict-transport-security"
```

## 参考资料

- [Vercel HTTPS 文档](https://vercel.com/docs/concepts/edge-network/https)
- [Next.js 安全头配置](https://nextjs.org/docs/app/building-your-application/configuring/headers)
- [OWASP HTTPS 配置指南](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html)
- [Let's Encrypt 文档](https://letsencrypt.org/docs/)

## 总结

Crusher 项目的 HTTPS 配置：

- ✅ Vercel 自动提供 HTTPS 证书
- ✅ 已配置安全头 (X-Frame-Options, CSP, etc.)
- ✅ 支持 TLS 1.2 和 TLS 1.3
- ✅ 自动证书续期
- ✅ HTTP 到 HTTPS 自动重定向

生产环境部署后，HTTPS 会自动启用，无需额外配置。
