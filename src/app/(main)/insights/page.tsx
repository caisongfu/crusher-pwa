'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, ChevronDown, ChevronUp, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ReactMarkdown from 'react-markdown'

import { markdownToPlainText } from '@/lib/utils'

// 透镜类型中文映射
const LENS_LABELS: Record<string, string> = {
  requirements: '需求分析',
  meeting: '会议纪要',
  review: '代码审查',
  risk: '风险评估',
  change: '变更分析',
  postmortem: '复盘分析',
  tech: '技术文档',
  custom: '自定义',
  all: '全部',
}

const FILTER_OPTIONS = ['all', 'requirements', 'meeting', 'review', 'risk', 'change', 'postmortem', 'tech', 'custom']

interface InsightWithDoc {
  id: string
  lens_type: string
  credits_cost: number
  created_at: string
  result: string
  documents: { id: string; title: string | null } | null
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightWithDoc[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lensFilter, setLensFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [copiedState, setCopiedState] = useState<{ id: string; mode: 'md' | 'txt' } | null>(null)

  const handleCopy = async (e: React.MouseEvent, insight: InsightWithDoc, mode: 'md' | 'txt') => {
    e.stopPropagation()
    const text = mode === 'md' ? insight.result : markdownToPlainText(insight.result)
    try {
      await navigator.clipboard.writeText(text)
      setCopiedState({ id: insight.id, mode })
      toast.success('已复制到剪贴板')
      setTimeout(() => setCopiedState(null), 2000)
    } catch {
      toast.error('复制失败，请手动选中文字复制')
    }
  }

  const fetchInsights = useCallback(async (pageNum: number, lens: string, replace: boolean) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '20',
      })
      if (lens !== 'all') params.set('lensType', lens)

      const res = await fetch(`/api/insights?${params}`)
      if (!res.ok) return
      const data = await res.json()

      setInsights((prev) => replace ? data.insights : [...prev, ...data.insights])
      setHasMore(data.meta.hasMore)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    fetchInsights(1, lensFilter, true)
  }, [lensFilter, fetchInsights])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchInsights(nextPage, lensFilter, false)
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold">透镜记录</h1>

      {/* 筛选器 */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt}
            size="sm"
            variant={lensFilter === opt ? 'default' : 'outline'}
            onClick={() => setLensFilter(opt)}
          >
            {LENS_LABELS[opt]}
          </Button>
        ))}
      </div>

      {/* 列表 */}
      {isLoading && insights.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">暂无分析记录</div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => {
            const isExpanded = expandedIds.has(insight.id)
            const docTitle = insight.documents?.title ?? '未命名文档'
            const lensLabel = LENS_LABELS[insight.lens_type] ?? insight.lens_type
            const date = new Date(insight.created_at).toLocaleDateString('zh-CN')

            return (
              <div key={insight.id} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <button
                  onClick={() => toggleExpand(insight.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left gap-3"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{lensLabel}</Badge>
                      <span className="text-sm text-zinc-700 truncate">《{docTitle}》</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {date} · 消耗 {insight.credits_cost} 积分
                    </p>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                  }
                </button>

                {isExpanded && (
                  <div className="border-t border-zinc-100">
                    <div className="flex justify-end gap-1 px-4 pt-2">
                      {(['md', 'txt'] as const).map((mode) => {
                        const isCopied = copiedState?.id === insight.id && copiedState.mode === mode
                        return (
                          <button
                            key={mode}
                            onClick={(e) => handleCopy(e, insight, mode)}
                            className="h-7 px-2 flex items-center gap-1 text-xs rounded transition-colors hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600"
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            <span>{isCopied ? '已复制' : `复制${mode}`}</span>
                          </button>
                        )
                      })}
                    </div>
                    <div className="px-4 pb-4 prose prose-sm max-w-none prose-zinc">
                      <ReactMarkdown>{insight.result}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {hasMore && (
            <div className="text-center pt-2">
              <Button variant="outline" onClick={loadMore} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '加载更多'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
