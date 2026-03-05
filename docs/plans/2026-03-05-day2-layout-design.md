# Day 2 双端布局设计文档

> 日期：2026-03-05
> 阶段：Day 2 / 9天开发路线图
> 验收标准：PC/移动端布局切换正常

## 目标

搭建主应用的双端响应式布局框架（PC 侧边栏 + 移动端底部导航），建立路由骨架页面，初始化 Zustand 全局状态基础结构。

## 架构设计

### 主布局组件树

```
src/app/(main)/layout.tsx（服务端）
  ├── 获取当前用户 profile → 注入客户端
  ├── <TopBar />           顶部栏（56px PC / 48px Mobile）
  │     ├── Logo "🪨 Crusher"
  │     ├── <CreditBadge credits={profile.credits} />（静态展示）
  │     └── <UserMenu user={user} />（下拉：登出）
  ├── <Sidebar />          PC 侧边栏（hidden md:flex, 240px）
  │     ├── 导航：首页 / 新建 / 文档 / 我的 / 透镜管理
  │     └── 底部：充值积分（链接到 profile）
  └── <BottomNav />        移动端底部导航（flex md:hidden, 56px）
        └── 首页 / 新建 / 文档 / 我的（4 个 tab）
```

### 文件结构

```
src/
  app/
    (main)/
      layout.tsx              ← 主布局（服务端 + 客户端组合）
      page.tsx                ← 首页骨架
      capture/page.tsx        ← 输入页骨架
      documents/[id]/page.tsx ← 文档详情骨架
      lenses/page.tsx         ← 透镜管理骨架
      profile/page.tsx        ← 个人资料骨架
    admin/
      layout.tsx              ← 管理后台布局
      page.tsx                ← 管理后台骨架
  components/
    layout/
      sidebar.tsx             ← PC 侧边栏
      bottom-nav.tsx          ← 移动端底部导航
      top-bar.tsx             ← 顶部栏
      announcement-banner.tsx ← 公告横幅（Day 6 填充）
    credit-badge.tsx          ← 积分徽章（静态 → Day 5 动态）
  store/
    index.ts                  ← 统一导出
    auth.ts                   ← user + profile + credits
```

## 骨架页面规格

| 页面 | 内容 |
|------|------|
| `(main)/page.tsx` | 空状态占位："还没有文档，点击新建开始" + 新建按钮 |
| `(main)/capture/page.tsx` | 标题 + "输入区域（Day 3 实现）" 占位文字 |
| `(main)/documents/[id]/page.tsx` | "文档详情（Day 3 实现）" |
| `(main)/lenses/page.tsx` | "透镜管理（Day 6 实现）" |
| `(main)/profile/page.tsx` | "个人资料（Day 5 实现）" |
| `admin/page.tsx` | 管理后台入口页面骨架 |

## Zustand Store（Day 2 基础）

```typescript
// src/store/auth.ts
interface AuthStore {
  user: User | null
  profile: Profile | null
  setProfile: (profile: Profile) => void
  updateCredits: (newBalance: number) => void
}
```

## 布局实现策略

```typescript
// 侧边栏：PC 显示，移动端隐藏
<aside className="hidden md:flex md:w-60 md:flex-col fixed inset-y-0 z-50">

// 底部导航：移动端显示，PC 隐藏
<nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 h-14">

// 内容区：移动端全宽，PC 端减去侧边栏，顶部留出 topbar 高度
<main className="flex-1 md:ml-60 pt-14 md:pt-14 pb-16 md:pb-0">
```

## Admin 布局规格

简洁顶部栏（Logo + "管理后台"标签）+ 左侧导航：
- 用户管理、支付订单、用量统计、Prompt 管理、公告管理、反馈管理

内容区域在 Day 7-8 填充。

## 验收标准

- [ ] PC 端（≥768px）：侧边栏固定左侧 240px，内容区右移，顶部栏显示积分和用户菜单
- [ ] 移动端（<768px）：侧边栏隐藏，底部导航显示，点击 tab 路由正确切换
- [ ] 所有骨架页面可正常访问，无报错
- [ ] 登出功能正常（UserMenu → 登出 → 跳转 /login）
- [ ] 未登录访问 (main) 路由自动跳转 /login（middleware 保证）
