import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123456';

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
