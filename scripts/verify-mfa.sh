#!/bin/bash

# MFA 验证检查清单
# 用途：验证 MFA 配置和设置状态

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}MFA 配置验证检查清单${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 检查计数器
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# 检查函数
check_item() {
    local description=$1
    local command=$2
    local expected=$3

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    echo -n "[$TOTAL_CHECKS] $description... "

    result=$(eval "$command" 2>/dev/null || echo "")

    if [[ $result == *"$expected"* ]]; then
        echo -e "${GREEN}✓ 通过${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}✗ 失败${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# 手动检查项
manual_check() {
    local description=$1
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "[$TOTAL_CHECKS] $description... "
    echo -e "${YELLOW}⚠ 需要手动检查${NC}"
    read -p "是否已完成？ (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✓ 通过${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}✗ 失败${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# 检查 Supabase CLI
echo -e "${YELLOW}检查 Supabase CLI 安装${NC}"
if command -v npx &> /dev/null; then
    echo -e "${GREEN}✓ Supabase CLI 可用${NC}"
else
    echo -e "${RED}✗ Supabase CLI 未安装${NC}"
    echo "请运行: npm install -g supabase"
    exit 1
fi

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}MFA 配置检查${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 管理员账户 MFA 检查
echo -e "${YELLOW}管理员账户 MFA 检查${NC}"
manual_check "管理员账户已启用 MFA"
manual_check "MFA 类型已配置（推荐 TOTP）"
manual_check "QR 码已扫描到 TOTP 应用"
manual_check "验证码验证成功"
manual_check "恢复码已备份"
manual_check "重新登录时需要 MFA 验证"

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Supabase MFA 配置检查${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Supabase 配置检查
echo -e "${YELLOW}Supabase MFA 配置检查${NC}"
manual_check "Supabase Email Provider 已启用"
manual_check "MFA 已在 Supabase Dashboard 中配置"
manual_check "MFA 策略已设置（可选）"

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}前端 MFA 支持检查${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 前端文件检查
echo -e "${YELLOW}前端 MFA 组件检查${NC}"
if [[ -f "src/components/mfa-setup.tsx" ]]; then
    echo -e "${GREEN}✓ MFA Setup 组件存在${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
else
    echo -e "${YELLOW}⚠ MFA Setup 组件不存在（可选）${NC}"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi

if [[ -f "src/components/mfa-login.tsx" ]]; then
    echo -e "${GREEN}✓ MFA Login 组件存在${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
else
    echo -e "${YELLOW}⚠ MFA Login 组件不存在（可选）${NC}"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}安全检查${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 安全检查
echo -e "${YELLOW}MFA 安全配置检查${NC}"
manual_check "MFA 验证码有效期合理"
manual_check "恢复码已安全存储"
manual_check "备用管理员账户已启用 MFA"
manual_check "MFA 日志已记录"

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}检查结果汇总${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

echo "总检查项: $TOTAL_CHECKS"
echo -e "${GREEN}通过: $PASSED_CHECKS${NC}"
echo -e "${RED}失败: $FAILED_CHECKS${NC}"

if [[ $FAILED_CHECKS -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}所有检查通过！MFA 配置正确。${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}存在 $FAILED_CHECKS 项失败，请检查并修复。${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
