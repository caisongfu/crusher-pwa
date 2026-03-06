import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123456';

test.describe('基础功能测试', () => {
  test('首页加载', async ({ page }) => {
    await page.goto(BASE_URL);
    // 应该重定向到登录页
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('h1')).toContainText('Crusher');
  });

  test('用户登录', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(`${BASE_URL}/`, { timeout: 10000 });

    // 验证页面标题
    const title = await page.title();
    expect(title).toContain('我的文档');
  });

  test('访问新建文档页面', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // 直接导航到新建文档页面
    await page.goto(`${BASE_URL}/capture`);

    // 验证页面元素
    await expect(page.locator('h1')).toContainText('新建文档');
    await expect(page.locator('label:has-text("原始内容")')).toBeVisible();
    await expect(page.locator('button:has-text("提交并分析")')).toBeVisible();
  });

  test('文档列表页面', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // 访问文档列表页面
    await page.goto(`${BASE_URL}/documents`);

    // 验证能访问
    await expect(page).toHaveURL(`${BASE_URL}/documents`);
  });

  test('透镜管理页面', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // 访问透镜管理页面
    await page.goto(`${BASE_URL}/lenses`);

    // 验证能访问
    await expect(page).toHaveURL(`${BASE_URL}/lenses`);
  });

  test('访问管理后台首页', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // 访问管理后台
    await page.goto(`${BASE_URL}/admin`);

    // 验证能访问（管理员账户）
    await expect(page).toHaveURL(`${BASE_URL}/admin`);

    // 验证页面没有错误
    await expect(page.locator('text=Application error')).not.toBeVisible();
  });

  test('访问公告管理', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // 访问公告管理页面
    await page.goto(`${BASE_URL}/admin/announcements`);

    // 验证能访问
    await expect(page).toHaveURL(`${BASE_URL}/admin/announcements`);
  });

  test('访问订单管理', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // 访问订单管理页面
    await page.goto(`${BASE_URL}/admin/orders`);

    // 验证能访问
    await expect(page).toHaveURL(`${BASE_URL}/admin/orders`);
  });

  test('访问反馈管理', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // 访问反馈管理页面
    await page.goto(`${BASE_URL}/admin/feedbacks`);

    // 验证能访问
    await expect(page).toHaveURL(`${BASE_URL}/admin/feedbacks`);
  });

  test('访问 Prompt 管理', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // 访问 Prompt 管理页面
    await page.goto(`${BASE_URL}/admin/prompts`);

    // 验证能访问
    await expect(page).toHaveURL(`${BASE_URL}/admin/prompts`);
  });
});
