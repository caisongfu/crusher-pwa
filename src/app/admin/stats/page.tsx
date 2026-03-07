"use client";

import { StatsCharts } from "@/components/admin/stats-charts";

export default function AdminStatsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">用量统计</h2>
      <StatsCharts />
    </div>
  );
}
