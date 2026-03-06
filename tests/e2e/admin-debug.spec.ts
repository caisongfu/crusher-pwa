import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123456';

test.describe('管理后台首页调试', () => {
  test('捕获应用错误详情', async ({ page }) => {
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

    // 捕获浏览器控制台错误
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // 等待一下收集错误
    await page.waitForTimeout(2000);

    // 获取页面内容
    const pageContent = await page.content();
    const pageTitle = await page.title();

    // 打印调试信息
    console.log('\n========== 调试信息 ==========');
    console.log('URL:', page.url());
    console.log('页面标题:', pageTitle);
    console.log('控制台错误数量:', errors.length);
    if (errors.length > 0) {
      console.log('\n控制台错误:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}.`, error);
      });
    }

    // 检查是否有应用错误
    const hasError = pageContent.includes('Application error');
    console.log('\n页面包含 Application error:', hasError);

    if (hasError) {
      // 提取错误信息
      const errorMatch = pageContent.match(/Application error.*?(?=<)/s);
      if (errorMatch) {
        console.log('\n错误文本:', errorMatch[0].substring(0, 200));
      }
    }

    // 保存页面 HTML 到文件（用于进一步分析）
    // 注意：在生产环境中，可以使用 playwright 的截图功能
    console.log('================================\n');
  });
});
