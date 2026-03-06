import type { NextConfig } from 'next';
import withPWA from '@ducanh2912/next-pwa';

const nextConfig: NextConfig = {
  // 安全 Headers
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
      // 为认证相关路由添加额外的缓存控制
      {
        source: '/(login|register)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },

  // 优化实验性功能
  experimental: {
    // 启用优化的包导入
    optimizePackageImports: ['lucide-react', '@radix-ui/react-*'],
  },

  // 服务器组件优化
  serverExternalPackages: ['@supabase/supabase-js'],
};

// PWA 配置
const withPWAConfig = withPWA({
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development',
});

export default withPWAConfig(nextConfig);
