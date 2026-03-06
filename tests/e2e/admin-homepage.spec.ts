import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123456';

test.describe('管理后台首页测试', () => {
  test('访问管理后台首页', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // 等待登录完成
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });

    // 访问管理后台
    await page.goto(`${BASE_URL}/admin`);

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 检查是否有应用错误
    const hasError = await page.locator('text=Application error').count() > 0;

    if (hasError) {
      // 捕获页面内容用于调试
      const pageTitle = await page.title();
      const pageContent = await page.content();

      console.log('\n=== 应用错误详情 ===');
      console.log('页面标题:', pageTitle);
      console.log('URL:', page.url());
      console.log('是否包含 Application error:', hasError);
      console.log('====================\n');
    }

    // 验证没有应用错误
    await expect(page.locator('text=Application error')).not.toBeVisible();
  });
});
