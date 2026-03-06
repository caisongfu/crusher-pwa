'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FeedbackDialog } from '@/components/feedback-dialog'
import type { Insight } from '@/types'

const LENS_META: Record<string, { icon: string; name: string }> = {
  requirements: { icon: '📋', name: '甲方需求' },
  meeting: { icon: '📝', name: '会议纪要' },
  review: { icon: '🔍', name: '需求评审' },
  risk: { icon: '⚠️', name: '风险识别' },
  change: { icon: '📊', name: '变更影响' },
  postmortem: { icon: '🐛', name: '问题复盘' },
  tech: { icon: '📖', name: '技术决策' },
  custom: { icon: '🔧', name: '自定义透镜' },
}

interface InsightResultProps {
  insight?: Insight
  isStreaming?: boolean
  streamContent?: string
  lensType?: string
}

export function InsightResult({
  insight,
  isStreaming,
  streamContent,
  lensType,
}: InsightResultProps) {
  const type = insight?.lens_type ?? lensType ?? 'custom'
  const meta = LENS_META[type] ?? { icon: '🔧', name: '分析结果' }
  const content = insight?.result ?? streamContent ?? ''
  const creditsCost = insight?.credits_cost

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <span>{meta.icon}</span>
          <span className="font-medium text-sm">{meta.name}</span>
          {isStreaming && (
            <span className="text-xs text-zinc-400 animate-pulse">生成中...</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {insight?.created_at && (
            <span className="text-xs text-zinc-400">
              {format(new Date(insight.created_at), 'MM-dd HH:mm', { locale: zhCN })}
            </span>
          )}
          {/* 更多操作菜单 */}
          {insight && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 flex items-center justify-center hover:bg-zinc-100 rounded transition-colors">
                  <MoreVertical className="h-4 w-4 text-zinc-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <FeedbackDialog
                    defaultType="other"
                    defaultRelatedInsightId={insight.id}
                    trigger={<span className="w-full text-left text-sm">反馈内容问题</span>}
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Markdown 内容 */}
      <div className="px-4 py-4 prose prose-sm prose-zinc max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content}
        </ReactMarkdown>
        {isStreaming && (
          <span className="inline-block w-0.5 h-4 bg-zinc-900 animate-pulse ml-0.5" />
        )}
      </div>

      {/* 底部：积分信息 */}
      {creditsCost !== undefined && (
        <div className="px-4 py-2 border-t border-zinc-100 text-xs text-zinc-400">
          消耗 {creditsCost} 积分
        </div>
      )}
    </div>
  )
}
