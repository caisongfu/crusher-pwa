# IP 白名单配置指南

## 概述

IP 白名单功能为管理后台提供额外的安全层，只允许特定 IP 地址访问 `/admin` 路由。

## 功能特性

- 支持单个 IP 地址
- 支持 CIDR 格式（例如：10.0.0.0/24）
- 支持多个 IP/CIDR（逗号分隔）
- 自动从请求头中获取真实 IP
- 支持代理和 CDN（Vercel、Cloudflare）
- 可选启用（留空则不启用）

## 配置方式

### 环境变量配置

在 `.env.production.local` 或 Vercel Dashboard 中添加：

```bash
# 单个 IP
ADMIN_IP_WHITELIST=192.168.1.100

# 多个 IP（逗号分隔）
ADMIN_IP_WHITELIST=192.168.1.100,192.168.1.101,203.0.113.50

# CIDR 格式（支持 IP 范围）
ADMIN_IP_WHITELIST=10.0.0.0/24,172.16.0.0/16

# 混合格式
ADMIN_IP_WHITELIST=192.168.1.100,10.0.0.0/24,203.0.113.50

# 禁用 IP 白名单（留空）
ADMIN_IP_WHITELIST=
```

### 在 Vercel Dashboard 中配置

1. 访问 Vercel Dashboard
2. 选择项目
3. 进入 Settings → Environment Variables
4. 添加 `ADMIN_IP_WHITELIST` 变量
5. 选择环境：Production
6. 点击 Save
7. 重新部署项目

## 工作原理

### IP 获取逻辑

Middleware 从以下 HTTP Header 中获取客户端真实 IP：

1. `cf-connecting-ip` - Cloudflare 提供的真实 IP
2. `x-real-ip` - Nginx 等代理提供的真实 IP
3. `x-forwarded-for` - 代理提供的 IP 列表（取第一个）

优先级：`cf-connecting-ip` > `x-real-ip` > `x-forwarded-for`

### IP 验证流程

```
请求到达 /admin 路由
    ↓
验证用户是否已登录
    ↓
验证用户角色是否为 admin
    ↓
检查 IP 白名单是否启用
    ↓
    ├─ 未启用（白名单为空）→ 允许访问
    └─ 已启用 → 验证客户端 IP
                ├─ IP 在白名单中 → 允许访问
                └─ IP 不在白名单中 → 拒绝访问，重定向到首页
```

### CIDR 匹配示例

```javascript
// 单个 IP
192.168.1.100 → 匹配 192.168.1.100

// /24 CIDR（256 个 IP）
10.0.0.0/24 → 匹配 10.0.0.0 - 10.0.0.255

// /16 CIDR（65536 个 IP）
172.16.0.0/16 → 匹配 172.16.0.0 - 172.16.255.255
```

## 使用场景

### 场景 1: 固定办公室 IP

```bash
# 办公室固定 IP
ADMIN_IP_WHITELIST=203.0.113.50
```

### 场景 2: 多个办公地点

```bash
# 北京办公室 + 上海办公室
ADMIN_IP_WHITELIST=203.0.113.50,203.0.113.51
```

### 场景 3: 公司内网

```bash
# 允许整个内网段访问
ADMIN_IP_WHITELIST=10.0.0.0/8
```

### 场景 4: VPN 网络范围

```bash
# 允许 VPN 客户端 IP 范围
ADMIN_IP_WHITELIST=10.8.0.0/24
```

## 如何获取 IP 地址

### 方法 1: 查看服务器日志

访问管理后台后，查看服务器日志：

```bash
# 查看 Vercel 日志
vercel logs

# 或在 Vercel Dashboard 中查看日志
```

日志中会显示：
```
[IP Whitelist] Allowed admin access from IP: 203.0.113.50
```

### 方法 2: 使用 IP 查询工具

访问 https://ipify.org 获取当前公网 IP。

### 方法 3: 使用命令行

```bash
# Linux/Mac
curl https://api.ipify.org

# 或
curl ifconfig.me
```

### 方法 4: 在浏览器控制台查看

```javascript
// 访问 https://api.ipify.org?format=json
fetch('https://api.ipify.org?format=json')
  .then(res => res.json())
  .then(data => console.log('Your IP:', data.ip));
```

## 测试 IP 白名单

### 本地测试

```bash
# 本地开发环境（localhost）不会触发 IP 白名单
# 因为本地 IP 是 127.0.0.1，通常不在白名单中

# 设置测试 IP
export ADMIN_IP_WHITELIST=127.0.0.1
npm run dev
```

### 生产环境测试

```bash
# 1. 配置测试 IP（使用当前 IP）
export ADMIN_IP_WHITELIST=203.0.113.50

# 2. 部署到 Vercel
vercel --prod

# 3. 访问管理后台
# 应该可以正常访问

# 4. 模拟非白名单 IP
# 使用 VPN 或代理更换 IP
# 访问管理后台应该被拒绝
```

### 测试脚本

创建测试脚本 `scripts/test-ip-whitelist.sh`：

```bash
#!/bin/bash

# IP 白名单测试脚本

APP_URL=${APP_URL:-"http://localhost:3000"}
TEST_IP=${TEST_IP:-$(curl -s https://api.ipify.org)}

echo "测试 IP 白名单功能"
echo "测试 URL: $APP_URL"
echo "测试 IP: $TEST_IP"
echo ""

# 测试 1: 访问首页（应该成功）
echo "测试 1: 访问首页"
curl -s -o /dev/null -w "状态码: %{http_code}\n" $APP_URL

# 测试 2: 访问管理后台（未登录，应该重定向到登录页）
echo "测试 2: 访问管理后台（未登录）"
curl -s -o /dev/null -w "状态码: %{http_code}\n" $APP_URL/admin

# 测试 3: 使用白名单外 IP（应该被拒绝）
echo "测试 3: 使用自定义 IP 访问管理后台"
curl -s -H "X-Forwarded-For: 1.2.3.4" -o /dev/null -w "状态码: %{http_code}\n" $APP_URL/admin
```

运行测试：

```bash
chmod +x scripts/test-ip-whitelist.sh
bash scripts/test-ip-whitelist.sh
```

## 常见问题

### 问题 1: 无法访问管理后台

**现象**：管理员账户可以登录，但访问 `/admin` 时被重定向到首页

**可能原因**：
1. IP 不在白名单中
2. 环境变量未正确配置
3. Vercel 部署后未重新加载环境变量

**解决方案**：
1. 检查当前 IP 是否在白名单中
2. 在 Vercel Dashboard 中验证环境变量
3. 重新部署项目：`vercel --prod`
4. 查看日志确认 IP：

```bash
vercel logs
```

### 问题 2: 获取的 IP 不正确

**现象**：日志中显示的 IP 与实际 IP 不符

**可能原因**：
1. 使用了代理或 VPN
2. CDN（Cloudflare）或代理服务器未正确配置 Header
3. 多层代理导致 IP 信息丢失

**解决方案**：
1. 检查代理/VPN 的 IP
2. 将代理 IP 添加到白名单
3. 确认 CDN 配置了正确的 IP Header

### 问题 3: CIDR 不工作

**现象**：配置了 CIDR，但该范围内的 IP 仍被拒绝

**可能原因**：
1. CIDR 格式错误
2. 网络掩码计算错误

**解决方案**：
1. 验证 CIDR 格式：`网络地址/掩码长度`
2. 使用在线 CIDR 计算器验证
3. 示例：`10.0.0.0/24` 表示 `10.0.0.0 - 10.0.0.255`

### 问题 4: 本地开发环境无法测试

**现象**：本地 `localhost:3000` 无法触发 IP 白名单

**原因**：本地 IP 是 `127.0.0.1`，通常不在白名单中

**解决方案**：
```bash
# 设置本地白名单
export ADMIN_IP_WHITELIST=127.0.0.1

# 或禁用 IP 白名单
export ADMIN_IP_WHITELIST=
```

## 安全最佳实践

### 1. 最小权限原则

只将必需的 IP 添加到白名单：

```bash
# ❌ 不推荐：允许整个内网
ADMIN_IP_WHITELIST=10.0.0.0/8

# ✅ 推荐：只允许特定子网
ADMIN_IP_WHITELIST=10.0.1.0/24
```

### 2. 定期审计白名单

定期检查和更新白名单：

```bash
# 每月审查一次白名单
# 移除不再需要的 IP
# 添加新需要的 IP
```

### 3. 使用 CIDR 而非单个 IP

对于有多个 IP 的场景，使用 CIDR：

```bash
# ✅ 推荐：使用 CIDR
ADMIN_IP_WHITELIST=10.0.1.0/24

# ❌ 不推荐：列出所有单个 IP
ADMIN_IP_WHITELIST=10.0.1.1,10.0.1.2,10.0.1.3,...
```

### 4. 监控访问日志

定期查看访问日志，发现异常活动：

```bash
# 查看 Vercel 日志
vercel logs

# 搜索被阻止的访问
vercel logs | grep "IP Whitelist"
```

### 5. 配置告警

当检测到未授权的 IP 尝试访问管理后台时，发送告警：

```typescript
// src/middleware.ts（在 IP 被阻止时）
if (!isIPAllowed(clientIP)) {
  console.warn(
    `[IP Whitelist] Blocked admin access from IP: ${clientIP}`
  );

  // TODO: 发送告警到管理员邮箱或 Slack
  // await sendAlert({ type: 'warning', message: 'Unauthorized admin access attempt', ip: clientIP });

  const redirectResponse = NextResponse.redirect(
    new URL("/?error=ip_not_allowed", request.url)
  );
  return redirectResponse;
}
```

## 与其他安全措施配合使用

IP 白名单应与其他安全措施配合使用：

### 1. MFA（多因素认证）

```bash
# 启用 MFA + IP 白名单
# 即使 IP 在白名单中，仍需要 MFA 验证
```

### 2. HTTPS

```bash
# 确保所有流量使用 HTTPS
# Vercel 自动提供 HTTPS
```

### 3. 强密码策略

```bash
# 要求管理员使用强密码
# 定期更换密码
```

### 4. 审计日志

```bash
# 记录所有管理后台访问
# 记录 IP、时间、操作
```

## 故障排查

### 检查 IP 白名单状态

```bash
# 1. 检查环境变量
echo $ADMIN_IP_WHITELIST

# 2. 检查 Vercel 环境变量
vercel env ls

# 3. 查看部署日志
vercel logs --prod

# 4. 测试 IP 解析
curl https://api.ipify.org
```

### 禁用 IP 白名单

如需临时禁用 IP 白名单：

```bash
# 方法 1: 清空环境变量
export ADMIN_IP_WHITELIST=

# 方法 2: 在 Vercel Dashboard 中删除变量
# Settings → Environment Variables → Delete

# 方法 3: 重新部署
vercel --prod
```

## 参考资料

- [Next.js Middleware 文档](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Vercel 环境变量文档](https://vercel.com/docs/projects/environment-variables)
- [CIDR 计算器](https://cidr.xyz/)
- [OWASP 访问控制指南](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)

## 总结

IP 白名单功能：

- ✅ 增强管理后台安全性
- ✅ 支持单个 IP 和 CIDR 格式
- ✅ 可选启用（留空则不启用）
- ✅ 自动获取真实 IP
- ✅ 支持代理和 CDN
- ✅ 建议与 MFA 配合使用

配置完成后，只有白名单中的 IP 才能访问管理后台，显著提升安全性。
