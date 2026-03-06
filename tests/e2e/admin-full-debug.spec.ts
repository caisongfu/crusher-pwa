import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123456';

test.describe('管理后台首页深度调试', () => {
  test('完整调试信息', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // 等待登录完成
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });

    // 监听所有控制台消息
    const allMessages: any[] = [];
    page.on('console', msg => {
      allMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });

    // 监听页面错误
    const pageErrors: any[] = [];
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack
      });
    });

    // 监听请求失败
    const failedRequests: any[] = [];
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()
      });
    });

    // 访问管理后台
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });

    // 等待页面完全加载
    await page.waitForTimeout(3000);

    // 收集信息
    const pageTitle = await page.title();
    const pageUrl = page.url();
    const pageContent = await page.content();

    console.log('\n========== 完整调试信息 ==========');
    console.log('URL:', pageUrl);
    console.log('页面标题:', pageTitle);
    console.log('页面长度:', pageContent.length);

    // 检查错误
    console.log('\n--- 控制台消息 ---');
    console.log('总消息数:', allMessages.length);
    const errors = allMessages.filter(m => m.type === 'error');
    console.log('错误数:', errors.length);
    if (errors.length > 0) {
      errors.forEach((err, i) => {
        console.log(`\n错误 ${i + 1}:`);
        console.log('  消息:', err.text);
        if (err.location) {
          console.log('  位置:', err.location);
        }
      });
    }

    console.log('\n--- 页面错误 ---');
    console.log('页面错误数:', pageErrors.length);
    if (pageErrors.length > 0) {
      pageErrors.forEach((err, i) => {
        console.log(`\n页面错误 ${i + 1}:`);
        console.log('  消息:', err.message);
        if (err.stack) {
          console.log('  堆栈:', err.stack?.substring(0, 300));
        }
      });
    }

    console.log('\n--- 失败请求 ---');
    console.log('失败请求数:', failedRequests.length);
    if (failedRequests.length > 0) {
      failedRequests.forEach((req, i) => {
        console.log(`\n请求 ${i + 1}:`);
        console.log('  URL:', req.url);
        console.log('  失败原因:', req.failure);
      });
    }

    // 检查页面内容
    const hasError = pageContent.includes('Application error');
    console.log('\n--- 页面状态 ---');
    console.log('包含 Application error:', hasError);

    if (hasError) {
      // 尝试提取更多错误信息
      const errorSection = pageContent.match(/Application error[\s\S]*?(?=<\/div>)/);
      if (errorSection) {
        console.log('\n错误区域:', errorSection[0].substring(0, 500));
      }

      // 检查是否有 Next.js 错误堆栈
      const stackMatch = pageContent.match(/Stack:[\s\S]*?(?=<\/div>)/);
      if (stackMatch) {
        console.log('\n堆栈信息:', stackMatch[0].substring(0, 500));
      }
    }

    // 截图保存
    await page.screenshot({ path: 'admin-error-screenshot.png', fullPage: true });
    console.log('\n截图已保存到: admin-error-screenshot.png');

    console.log('=================================\n');
  });
});
