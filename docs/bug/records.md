# bug记录

***

## Markdown 分析结果表格未渲染

**🔧 修复状态**：✅ 已修复

**📅 记录日期**：2026-03-10

**🏷️ BUG类型**：UI 显示问题

**📝 描述**：透镜分析结果页面存在两处 Bug：① `@tailwindcss/typography` 插件未安装，`prose` 相关类（`prose-sm`、`prose-zinc` 等）完全无效，导致 Markdown 内容（标题、列表、代码块、表格等）均以纯文本渲染，无任何格式样式；② `InsightResult` 父容器设置了 `overflow-hidden`，且表格缺少横向滚动包裹层，超出宽度的表格内容被直接裁剪，表格不可见。

**💥 影响**：
- 所有透镜分析结果的 Markdown 格式失效，用户体验严重下降
- 分析结果中的表格内容完全不可见，信息丢失

**💡 修复建议**：安装 `@tailwindcss/typography` 并在 Tailwind 配置中注册；为 ReactMarkdown 添加自定义 `table` 组件，用 `overflow-x-auto` 容器包裹，同时为 `th`、`td` 补充边框和内边距样式。

### 修复过程

1. 执行 `npm install @tailwindcss/typography` 安装插件
2. 在 `tailwind.config.ts` 的 `plugins` 数组中注册 `require('@tailwindcss/typography')`
3. 在 `insight-result.tsx` 的 prose 容器增加 `overflow-x-auto`
4. 为 `ReactMarkdown` 添加 `components` 自定义渲染：`table` 用 `overflow-x-auto` div 包裹，`thead` 设背景色，`th`/`td` 统一边框、内边距、字色样式

### 修复文件

- `tailwind.config.ts`
- `src/components/insights/insight-result.tsx`

### 修复结果

**⏰ 修复时间**：2026-03-10

**👤 修复人**：蔡松甫

**✔️ 修复结果**：Markdown 格式正常渲染，表格可见且支持横向滚动，分析结果展示效果完整。

**🔗 提交哈希**：`380e684930b9eac748cf8fd2a58aa801846221b7`

***

## 管理反馈页三处运行时错误及 SSR Hydration 不匹配

**🔧 修复状态**：✅ 已修复

**📅 记录日期**：2026-03-09

**🏷️ BUG类型**：UI 显示问题

**📝 描述**：管理后台用户反馈页面存在三处 Bug：①处理对话框中对 `selectedFeedback` 使用了非空断言 `!`，在 Dialog 先于状态赋值渲染时抛出 `Cannot read properties of null (reading 'status')`；②筛选器"全部类型"和"全部状态"的 `<SelectItem value="">` 使用空字符串，触发 Radix UI 警告（空字符串被保留用于清除选择）；③表格中 `formatDistanceToNow` 生成的相对时间在服务端与客户端存在时间差，引发 SSR Hydration 不匹配警告。

**💥 影响**：
- 点击"处理"按钮时可能崩溃，Dialog 无法正常展示状态信息
- 控制台持续输出 Radix UI SelectItem 警告，筛选功能存在潜在异常
- 控制台输出 hydration 不匹配警告，影响 React 渲染可靠性

**💡 修复建议**：将 `!` 非空断言改为条件判断；SelectItem 空字符串改为 `'all'` 哨兵值并在 `onValueChange` 中做映射；对含相对时间的 `<TableCell>` 加 `suppressHydrationWarning`。

### 修复过程

1. 将 Dialog 中 `STATUS_VARIANTS[selectedFeedback!.status]` 改为条件表达式 `selectedFeedback ? STATUS_VARIANTS[selectedFeedback.status] : 'secondary'`，`STATUS_LABELS` 同理
2. 将两个筛选 Select 的"全部"选项从 `value=""` 改为 `value="all"`，`onValueChange` 中将 `'all'` 映射回空字符串，`value` 绑定使用 `selectedXxx || 'all'`
3. 对 `formatDistanceToNow` 所在的 `<TableCell>` 添加 `suppressHydrationWarning` 属性

### 修复文件

- `src/app/admin/feedbacks/page.tsx`

**👤 修复人**：蔡松甫

**✨ 修复结果**：三处报错消除，Dialog 可正常渲染，筛选器无警告，hydration 不匹配不再出现。

**🔗 提交哈希**：`a66f3e69fb7ec193ee738d6074a122227df46746`

***

## 管理后台用户反馈入口缺失及多处显示 Bug

**🔧 修复状态**：✅ 已修复

**📅 记录日期**：2026-03-09

**🏷️ BUG类型**：UI 显示问题

**📝 描述**：管理后台侧边栏导航中缺少"用户反馈"、"公告管理"、"提示词管理"三个入口，管理员无法通过侧边栏导航到对应页面。同时顶部标题使用 `startsWith` 匹配导致所有子页面均显示"用户管理"，以及反馈列表中用户信息列因缺少 JSX 表达式包裹 `{}` 而渲染为字面字符串。

**💥 影响**：
- 管理员无法通过导航访问用户反馈、公告管理、提示词管理页面，相关功能形同虚设
- 管理后台所有子页面顶部标题均错误显示为"用户管理"
- 反馈列表"用户"列显示 `(feedback.profiles?.email || ...)` 字面文字，无法查看真实用户信息

**💡 修复建议**：在 `admin-layout.tsx` 导航数组中补充缺失的三个入口；修正顶部标题的路径匹配逻辑；在 feedbacks 页面中为用户信息表达式添加 `{}`。

### 修复过程

1. 在 `admin-layout.tsx` 的 `navigation` 数组中追加三条导航项：用户反馈（`/admin/feedbacks`）、公告管理（`/admin/announcements`）、提示词管理（`/admin/prompts`），并引入对应 lucide 图标
2. 修正顶部标题匹配逻辑，将 `pathname.startsWith(item.href)` 改为 `pathname === item.href || pathname.startsWith(item.href + '/')`，避免 `/admin` 前缀误匹配所有子路由
3. 修复 `feedbacks/page.tsx` 第 278 行：将 `(feedback.profiles?.email || ...)` 包裹为 JSX 表达式 `{(feedback as any).profiles?.email || ...}`

### 修复文件

- `src/components/admin/admin-layout.tsx`
- `src/app/admin/feedbacks/page.tsx`

### 修复结果

**⏰ 修复时间**：2026-03-09

**👤 修复人**：蔡松甫

**✔️ 修复结果**：管理后台侧边栏新增用户反馈、公告管理、提示词管理三个入口；顶部标题正确显示当前页面名称；反馈列表用户列正常显示邮箱或用户名。

***

## logo错误

**🔧 修复状态**：⌛️ dai修复

**📅 记录日期**：2023-08-10

**🏷️ BUG类型**：资源错误

**📝 描述**：登录页和注册页，没有使用自定义logo，还是emoji图标

**💥 影响**：logo错乱

**💡 修复建议**：在登录页和注册页中使用自定义logo，替换emoji图标

### 修复过程

（待补充）

### 修复文件

（待补充）

### 修复结果

**⏰ 修复时间**：2023-08-10

**👤 修复人**：caisongfu

**✔️ 修复结果**：登录页和注册页中使用自定义logo，emoji图标被替换

***

## 初始积分问题

**🔧 修复状态**：✅ 已修复

**📅 记录日期**：2023-08-10

**🏷️ BUG类型**：业务优化

**📝 描述**：初始用户没有积分

**💥 影响**：用户无法使用积分功能

**💡 修复建议**：在用户注册时，为其分配初始积分：100

### 修复过程

更新 `handle_new_user()` 触发器函数：
1. 将 profile 初始 `credits` 从 `0` 改为 `100`
2. 同步写入 `credit_transactions` 记录（type: `manual_grant`，描述：新用户注册赠送积分）

### 修复文件

- supabase/migrations/20260308_fix_initial_credits.sql（新增 migration）
- supabase/migrations/006_auth_profile_trigger.sql（添加注释说明）

### 修复结果

**⏰ 修复时间**：2026-03-08

**👤 修复人**：蔡松甫

**✔️ 修复结果**：新用户注册后自动获得 100 初始积分，并生成对应的积分交易记录

***

## 切换账号数据残留

**🔧 修复状态**：✅ 已修复

**📅 记录日期**：2026-03-08

**🏷️ BUG类型**：数据残留问题

**📝 描述**：切换账号后文档列表残留旧账号数据

**💥 影响**：退出登录时未重置 Zustand 内存 store，导致新账号登录后 DocumentsList 首次渲染瞬间显示前一账号的文档数据，造成数据混乱和隐私泄露风险

**💡 修复建议**：在退出登录时重置所有 Zustand store，并在 fetchDocuments 开始时同步清空旧文档数据

### 修复过程

1. documents/insights store 各新增 reset() 方法
2. handleLogout 退出前先调用所有 store 的 reset()，移除多余的 router.refresh()
3. fetchDocuments 开始时同步清空旧文档数据，防止新账号下短暂闪出旧数据

### 修复文件

- src/app/(auth)/login/page.tsx
- src/components/documents/documents-list.tsx
- src/components/layout/top-bar.tsx
- src/middleware.ts
- src/store/documents.ts
- src/store/insights.ts
- src/types/index.ts

### 修复结果

**⏰ 修复时间**：2026-03-08 00:59:33

**👤 修复人**：蔡松甫

**✔️ 修复结果**：退出登录时正确重置所有 store，新账号登录后不再显示旧账号数据

**🔗 提交哈希**：7c1eaf90fc286e1196fc26302c8918de258dfb6b

***

## 前端断开导致分析结果丢失

**🔧 修复状态**：✅ 已修复

**📅 记录日期**：2026-03-08

**🏷️ BUG类型**：数据保存失败

**📝 描述**：前端断开时后端无法保存分析结果

**💥 影响**：当用户在分析过程中刷新页面或关闭浏览器时，后端 DeepSeek 流式响应已完成，但因前端连接断开导致 enqueue 抛异常，最终分析结果未能入库，造成积分浪费

**💡 修复建议**：将数据库插入操作移至 finally 块，确保无论前端是否断开都能保存结果

### 修复过程

1. enqueue 加 try/catch：客户端断开连接时 enqueue 抛异常不再中断 DeepSeek 流的消费
2. insert 移至 finally 块：无论前端是否刷新/关闭，DeepSeek 流结束后必然入库
3. 前端 document-detail 已单独提交 15 秒倒计时与后台模式逻辑

### 修复文件

- src/app/api/insights/route.ts

### 修复结果

**⏰ 修复时间**：2026-03-08 01:07:16

**👤 修复人**：蔡松甫

**✔️ 修复结果**：前端断开连接时，后端仍能正常保存完整的分析结果到数据库

**🔗 提交哈希**：4585b7e54507892ae0c2bbe223eb9a104a25632c

***

## 用户详情页邮箱缺失

**🔧 修复状态**：✅ 已修复

**📅 记录日期**：2026-03-07

**🏷️ BUG类型**：UI 显示问题

**📝 描述**：用户详情页邮箱字段不显示

**💥 影响**：管理员在用户详情页无法查看用户邮箱信息，影响用户管理和问题排查

**💡 修复建议**：API 层额外调用 auth.admin.getUserById 获取邮箱并合并至响应

### 修复过程

1. API 层额外调用 auth.admin.getUserById 获取邮箱并合并至响应
2. 前端新增待审批积分操作展示及审批/拒绝功能

### 修复文件

- src/app/api/admin/users/\[id]/route.ts
- src/components/admin/user-detail.tsx

### 修复结果

**⏰ 修复时间**：2026-03-07 18:49:30

**👤 修复人**：蔡松甫

**✔️ 修复结果**：用户详情页正确显示邮箱字段，并新增积分审批功能

**🔗 提交哈希**：62bbcbc4339af47cc6ab5d2cacc1661580bebbb1

***

## 未实现功能导航项显示

**🔧 修复状态**：✅ 已修复

**📅 记录日期**：2026-03-07

**🏷️ BUG类型**：UI 优化

**📝 描述**：管理后台显示未实现的系统设置导航项

**💥 影响**：用户点击系统设置导航项后无法访问对应功能，造成困惑

**💡 修复建议**：隐藏未实现的系统设置导航项

### 修复过程

移除 admin-layout.tsx 中的系统设置导航项代码

### 修复文件

- src/components/admin/admin-layout.tsx

### 修复结果

**⏰ 修复时间**：2026-03-07 16:34:38

**👤 修复人**：蔡松甫

**✔️ 修复结果**：管理后台不再显示未实现的系统设置导航项

**🔗 提交哈希**：5b7d3ac2ad8cd6151b6e3f1fa61c8bd4523ff490

***

## 积分调整 API 逻辑错误

**🔧 修复状态**：✅ 已修复

**📅 记录日期**：2026-03-07

**🏷️ BUG类型**：业务逻辑错误

**📝 描述**：积分调整 API 未正确更新 profiles.credits 字段

**💥 影响**：管理员调整用户积分时，credit\_transactions 表有记录但 profiles.credits 未更新，导致用户实际积分余额不正确

**💡 修复建议**：直接更新 profiles.credits 并写入 credit\_transactions

### 修复过程

重构积分调整 API，确保同时更新 profiles.credits 和 credit\_transactions 表

### 修复文件

- src/app/admin/users/\[id]/admin-credit-form.tsx
- src/app/api/admin/credits/route.ts

### 修复结果

**⏰ 修复时间**：2026-03-07 16:34:29

**👤 修复人**：蔡松甫

**✔️ 修复结果**：积分调整 API 正确更新用户积分余额和交易记录

**🔗 提交哈希**：45e030273906c48ace4fbacbacd3953abdb89c52

***

