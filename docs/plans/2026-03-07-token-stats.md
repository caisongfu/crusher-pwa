# Token 用量统计集成 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在管理后台用量统计图表页中新增 DeepSeek Token 消耗（input + output）的指标卡和趋势图。

**Architecture:** 扩展 `daily_stats` 表加入 token 聚合字段，更新两个 DB 函数（`update_daily_stats` / `get_today_stats`），同步更新 TypeScript 类型和前端图表组件。

**Tech Stack:** PostgreSQL（Supabase）、TypeScript、React、Recharts

---

## Task 1: 数据库迁移

**Files:**
- Create: `supabase/migrations/20260307_token_stats.sql`
- 用户需在 Supabase Dashboard > SQL Editor 中执行此文件

**Step 1: 创建迁移文件**

写入以下完整 SQL：

```sql
-- =============================================
-- Token 用量统计：daily_stats 新增 token 字段
-- =============================================

-- 1. 新增两列
ALTER TABLE daily_stats
  ADD COLUMN IF NOT EXISTS total_input_tokens  BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_output_tokens BIGINT NOT NULL DEFAULT 0;

-- 2. 更新 get_today_stats 函数（实时今日统计）
CREATE OR REPLACE FUNCTION get_today_stats() RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'date',                   CURRENT_DATE,
    'total_users',            (SELECT COUNT(*) FROM profiles),
    'active_users',           (SELECT COUNT(DISTINCT user_id) FROM insights WHERE created_at >= CURRENT_DATE),
    'total_insights',         (SELECT COUNT(*) FROM insights WHERE created_at >= CURRENT_DATE),
    'total_credits_consumed', COALESCE((SELECT SUM(credits_cost)    FROM insights WHERE created_at >= CURRENT_DATE), 0),
    'total_input_tokens',     COALESCE((SELECT SUM(input_tokens)    FROM insights WHERE created_at >= CURRENT_DATE), 0),
    'total_output_tokens',    COALESCE((SELECT SUM(output_tokens)   FROM insights WHERE created_at >= CURRENT_DATE), 0),
    'lens_distribution',      COALESCE((
      SELECT json_object_agg(lens_type, count)
      FROM (
        SELECT lens_type, COUNT(*) as count
        FROM insights
        WHERE created_at >= CURRENT_DATE
        GROUP BY lens_type
      ) subquery
    ), '{}'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. 更新 update_daily_stats 函数（定时汇总归档）
CREATE OR REPLACE FUNCTION update_daily_stats(p_date DATE DEFAULT CURRENT_DATE) RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_stats (
    date, total_users, active_users, total_insights,
    total_credits_consumed, total_revenue_fen,
    total_input_tokens, total_output_tokens,
    lens_distribution
  )
  VALUES (
    p_date,
    (SELECT COUNT(*) FROM profiles WHERE created_at < p_date + INTERVAL '1 day'),
    (SELECT COUNT(DISTINCT user_id) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'),
    (SELECT COUNT(*) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'),
    COALESCE((SELECT SUM(credits_cost)  FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'), 0),
    COALESCE((SELECT SUM(amount_fen)    FROM payment_orders WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day' AND status = 'paid'), 0),
    COALESCE((SELECT SUM(input_tokens)  FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'), 0),
    COALESCE((SELECT SUM(output_tokens) FROM insights WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'), 0),
    COALESCE((
      SELECT json_object_agg(lens_type, count)
      FROM (
        SELECT lens_type, COUNT(*) as count
        FROM insights
        WHERE created_at >= p_date AND created_at < p_date + INTERVAL '1 day'
        GROUP BY lens_type
      ) subquery
    ), '{}'::jsonb)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_users             = EXCLUDED.total_users,
    active_users            = EXCLUDED.active_users,
    total_insights          = EXCLUDED.total_insights,
    total_credits_consumed  = EXCLUDED.total_credits_consumed,
    total_revenue_fen       = EXCLUDED.total_revenue_fen,
    total_input_tokens      = EXCLUDED.total_input_tokens,
    total_output_tokens     = EXCLUDED.total_output_tokens,
    lens_distribution       = EXCLUDED.lens_distribution,
    updated_at              = NOW();
END;
$$ LANGUAGE plpgsql;
```

**Step 2: 提示用户执行**
在 Supabase Dashboard → SQL Editor 中粘贴并运行上述 SQL。

**Step 3: 验证**
在 SQL Editor 中运行：
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'daily_stats'
ORDER BY ordinal_position;
```
预期看到 `total_input_tokens` 和 `total_output_tokens` 两列。

---

## Task 2: 更新 TypeScript 类型

**Files:**
- Modify: `src/types/supabase.ts`（`daily_stats` 的 Row / Insert / Update 三处）

**Step 1: Row 类型新增字段**

在 `daily_stats.Row` 中加入：
```typescript
total_input_tokens: number
total_output_tokens: number
```

**Step 2: Insert 类型新增字段**

在 `daily_stats.Insert` 中加入：
```typescript
total_input_tokens?: number
total_output_tokens?: number
```

**Step 3: Update 类型新增字段**

在 `daily_stats.Update` 中加入：
```typescript
total_input_tokens?: number
total_output_tokens?: number
```

**Step 4: 更新 get_today_stats 返回类型**

在 `get_today_stats.Returns` 中加入：
```typescript
total_input_tokens: number
total_output_tokens: number
```

---

## Task 3: 更新前端组件

**Files:**
- Modify: `src/components/admin/stats-charts.tsx`

**Step 1: 扩展 DailyStats 接口**

```typescript
interface DailyStats {
  date: string;
  new_users: number;
  orders: number;
  revenue: number;
  credits_consumed: number;
  active_users: number;
  total_input_tokens: number;   // 新增
  total_output_tokens: number;  // 新增
}
```

**Step 2: 扩展 totals 聚合逻辑**

在 `useMemo` 的 reduce 中加入：
```typescript
inputTokens:  acc.inputTokens  + stat.total_input_tokens,
outputTokens: acc.outputTokens + stat.total_output_tokens,
```
初始值加：
```typescript
inputTokens: 0,
outputTokens: 0,
```

**Step 3: 添加格式化工具函数**

在组件文件顶部 import 区域后加入：
```typescript
// 格式化 token 数量（K / M）
function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
```

**Step 4: 新增 2 个指标卡**

在现有「积分消耗」卡片后插入：
```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium">输入 Token</CardTitle>
    <Cpu className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{formatTokens(totals.inputTokens)}</div>
    <p className="text-xs text-muted-foreground">
      期间共消耗 {formatTokens(totals.inputTokens)} input tokens
    </p>
  </CardContent>
</Card>

<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium">输出 Token</CardTitle>
    <Cpu className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{formatTokens(totals.outputTokens)}</div>
    <p className="text-xs text-muted-foreground">
      期间共生成 {formatTokens(totals.outputTokens)} output tokens
    </p>
  </CardContent>
</Card>
```

同时从 `lucide-react` 导入 `Cpu` 图标。

**Step 5: 将指标卡 grid 改为 md:grid-cols-6**

当前 4 列 → 改为 6 列：
```tsx
<div className="grid grid-cols-1 md:grid-cols-6 gap-4">
```
（或拆为两行：4 列 + 2 列，视 UI 效果决定）

**Step 6: 新增 Token 趋势折线图**

在「积分消耗」图后新增：
```tsx
{stats.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>Token 消耗趋势</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={stats}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatDateToMD} />
          <YAxis tickFormatter={(v) => formatTokens(v)} />
          <Tooltip
            labelFormatter={(label) => new Date(label).toLocaleDateString("zh-CN")}
            formatter={(value: number, name: string) => [formatTokens(value), name]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="total_input_tokens"
            stroke="#6366f1"
            strokeWidth={2}
            name="输入 Token"
          />
          <Line
            type="monotone"
            dataKey="total_output_tokens"
            stroke="#f59e0b"
            strokeWidth={2}
            name="输出 Token"
          />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
)}
```

---

## 注意事项

- `insights.input_tokens` 字段允许 null（历史数据可能未记录），DB 聚合中已用 `COALESCE` 处理
- 历史 `daily_stats` 已归档的行 token 字段默认为 0，需手动触发 `SELECT update_daily_stats('2026-03-06')` 等逐日补跑
- 今日数据由 `get_today_stats()` 实时计算，无需补跑
