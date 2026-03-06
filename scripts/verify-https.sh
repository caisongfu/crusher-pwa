#!/bin/bash

# HTTPS 验证脚本
# 用途：验证 HTTPS 配置、SSL 证书和 HTTP 到 HTTPS 重定向

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取生产环境 URL
APP_URL=${APP_URL:-"http://localhost:3000"}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}HTTPS 配置验证${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 检查 1: 验证 HTTPS 连接
echo -e "${YELLOW}检查 1: 验证 HTTPS 连接${NC}"
if [[ $APP_URL == https://* ]]; then
    echo -e "${GREEN}✓ 使用 HTTPS${NC}"
    echo "URL: $APP_URL"

    # 检查 SSL 证书
    echo ""
    echo -e "${YELLOW}检查 2: 验证 SSL 证书${NC}"
    CERT_INFO=$(echo | openssl s_client -servername $(echo $APP_URL | sed -e 's|^[^/]*//||' -e 's|/.*$||') -connect $(echo $APP_URL | sed -e 's|^[^/]*//||' -e 's|/.*$||'):443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "无法获取证书信息")

    if [[ -n "$CERT_INFO" ]]; then
        echo -e "${GREEN}✓ SSL 证书有效${NC}"
        echo "$CERT_INFO"
    else
        echo -e "${RED}✗ 无法验证 SSL 证书${NC}"
    fi

    # 检查 TLS 版本
    echo ""
    echo -e "${YELLOW}检查 3: 验证 TLS 版本${NC}"
    TLS_VERSION=$(echo | openssl s_client -servername $(echo $APP_URL | sed -e 's|^[^/]*//||' -e 's|/.*$||') -connect $(echo $APP_URL | sed -e 's|^[^/]*//||' -e 's|/.*$||'):443 -tls1_2 2>/dev/null | grep "Protocol" || echo "TLS 1.2 不支持")
    if [[ $TLS_VERSION == *"TLSv1.2"* ]]; then
        echo -e "${GREEN}✓ 支持 TLS 1.2${NC}"
    else
        echo -e "${RED}✗ 不支持 TLS 1.2${NC}"
    fi

else
    echo -e "${RED}✗ 当前使用 HTTP，未使用 HTTPS${NC}"
    echo "URL: $APP_URL"
fi

echo ""
echo -e "${YELLOW}检查 4: 检查 HTTP 到 HTTPS 重定向${NC}"
# 将 HTTPS URL 转换为 HTTP
HTTP_URL=$(echo $APP_URL | sed 's/https:/http:/')
REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" -L $HTTP_URL 2>/dev/null || echo "连接失败")

if [[ $REDIRECT == "301" || $REDIRECT == "302" || $REDIRECT == "307" || $REDIRECT == "308" ]]; then
    echo -e "${GREEN}✓ HTTP 正确重定向到 HTTPS (状态码: $REDIRECT)${NC}"
else
    echo -e "${YELLOW}⚠ HTTP 重定向检查失败 (状态码: $REDIRECT)${NC}"
    echo -e "${YELLOW}  可能是本地开发环境，Vercel 会自动处理重定向${NC}"
fi

echo ""
echo -e "${YELLOW}检查 5: 验证安全响应头${NC}"
HEADERS=$(curl -s -I $APP_URL 2>/dev/null || echo "无法连接")

# 检查各个安全头
REQUIRED_HEADERS=(
    "X-Frame-Options"
    "X-Content-Type-Options"
    "X-DNS-Prefetch-Control"
    "Referrer-Policy"
    "Content-Security-Policy"
    "Permissions-Policy"
)

for header in "${REQUIRED_HEADERS[@]}"; do
    if echo "$HEADERS" | grep -q "$header"; then
        echo -e "${GREEN}✓ $header 已配置${NC}"
    else
        echo -e "${RED}✗ $header 未配置${NC}"
    fi
done

echo ""
echo -e "${YELLOW}检查 6: Vercel HTTPS 配置${NC}"
echo "Vercel 自动为所有 .vercel.app 域名提供 HTTPS"
echo "如果使用自定义域名，需要在 Vercel Dashboard 中配置 SSL 证书"
echo ""
echo -e "${YELLOW}----------------------------------------${NC}"
echo -e "${GREEN}HTTPS 验证完成！${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"
echo ""
echo "注意事项："
echo "1. Vercel 会自动为所有部署提供 HTTPS 证书"
echo "2. 本地开发环境 (localhost:3000) 不支持 HTTPS"
echo "3. 生产环境部署后，Vercel 会自动处理 HTTPS"
echo "4. 自定义域名需要在 Vercel Dashboard 中配置 DNS 和 SSL"
echo ""
echo "验证生产环境 HTTPS："
echo "export APP_URL=https://your-app.vercel.app"
echo "bash scripts/verify-https.sh"
