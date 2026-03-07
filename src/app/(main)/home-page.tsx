'use client'

import { useState, useEffect } from 'react'
import { AnnouncementBanner } from '@/components/announcement-banner'
import { Loader2, Coins, FileText, BarChart2, Sparkles } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// 透镜中文名映射
const LENS_LABELS: Record<string, string> = {
  requirements: '需求分析',
  meeting: '会议纪要',
  review: '代码审查',
  risk: '风险评估',
  change: '变更分析',
  postmortem: '复盘分析',
  tech: '技术文档',
  custom: '自定义',
}

// 饼图颜色
const PIE_COLORS = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7', '#f4f4f5']

interface HomeStats {
  credits: number
  documentCount: number
  analysisCount: number
  topLens: string | null
  last7Days: { date: string; count: number }[]
  lensDistribution: { lens: string; count: number }[]
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  )
}

export function HomePageContent() {
  const [announcements, setAnnouncements] = useState([])
  const [stats, setStats] = useState<HomeStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [annRes, statsRes] = await Promise.all([
          fetch('/api/announcements'),
          fetch('/api/stats/home'),
        ])
        if (annRes.ok) {
          const d = await annRes.json()
          setAnnouncements(d.announcements ?? [])
        }
        if (statsRes.ok) {
          setStats(await statsRes.json())
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchAll()
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* 公告横幅 */}
      {announcements.length > 0 && <AnnouncementBanner announcements={announcements} />}

      <h1 className="text-2xl font-bold">数据概览</h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : stats ? (
        <>
          {/* 四格统计卡片 */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Coins className="h-4 w-4" />}
              label="当前积分"
              value={stats.credits}
            />
            <StatCard
              icon={<FileText className="h-4 w-4" />}
              label="文档总数"
              value={stats.documentCount}
            />
            <StatCard
              icon={<BarChart2 className="h-4 w-4" />}
              label="分析次数"
              value={stats.analysisCount}
            />
            <StatCard
              icon={<Sparkles className="h-4 w-4" />}
              label="最常用透镜"
              value={stats.topLens ? (LENS_LABELS[stats.topLens] ?? stats.topLens) : '暂无'}
            />
          </div>

          {/* 近 7 天趋势柱状图 */}
          {stats.last7Days.some((d) => d.count > 0) && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-sm font-medium text-zinc-700 mb-3">近 7 天分析趋势</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={stats.last7Days} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => v.slice(5)} // MM-DD
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => [value, '分析次数']}
                    labelFormatter={(label: string) => label}
                  />
                  <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 透镜占比饼图 */}
          {stats.lensDistribution.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-sm font-medium text-zinc-700 mb-3">透镜使用分布</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.lensDistribution}
                    dataKey="count"
                    nameKey="lens"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ lens, percent }: { lens: string; percent: number }) =>
                      `${LENS_LABELS[lens] ?? lens} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {stats.lensDistribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, LENS_LABELS[name] ?? name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 无数据时的空状态 */}
          {stats.analysisCount === 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
              <p className="text-zinc-400 text-sm">还没有分析记录，去文档页面开始使用透镜吧</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
