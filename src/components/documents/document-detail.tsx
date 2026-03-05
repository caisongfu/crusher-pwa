// src/components/documents/document-detail.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronLeft, FileText, Mic, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Document } from '@/types'

interface DocumentDetailProps {
  document: Document
}

const FOLD_THRESHOLD = 500

export function DocumentDetail({ document }: DocumentDetailProps) {
  const [isExpanded, setIsExpanded] = useState(document.raw_content.length <= FOLD_THRESHOLD)

  const timeAgo = formatDistanceToNow(new Date(document.created_at), {
    addSuffix: true,
    locale: zhCN,
  })

  const displayContent = isExpanded
    ? document.raw_content
    : document.raw_content.slice(0, FOLD_THRESHOLD)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link href="/">
          <ChevronLeft className="h-4 w-4 mr-1" />
          返回列表
        </Link>
      </Button>

      <h1 className="text-2xl font-bold mb-2">
        {document.title ?? document.raw_content.slice(0, 50)}
      </h1>

      <div className="flex items-center gap-3 text-sm text-zinc-500 mb-6">
        {document.source_type === 'voice' ? (
          <span className="flex items-center gap-1">
            <Mic className="h-3.5 w-3.5" /> 语音输入
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" /> 文字输入
          </span>
        )}
        <span>{document.char_count.toLocaleString()} 字</span>
        <span>{timeAgo}</span>
      </div>

      <Separator className="mb-6" />

      <div>
        <h2 className="text-base font-semibold text-zinc-700 mb-3">原始内容</h2>
        <div className="whitespace-pre-wrap text-sm text-zinc-700 leading-relaxed">
          {displayContent}
          {!isExpanded && document.raw_content.length > FOLD_THRESHOLD && '…'}
        </div>

        {document.raw_content.length > FOLD_THRESHOLD && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-zinc-500"
          >
            {isExpanded ? (
              <><ChevronUp className="h-4 w-4 mr-1" />收起</>
            ) : (
              <><ChevronDown className="h-4 w-4 mr-1" />展开全文</>
            )}
          </Button>
        )}
      </div>

      <Separator className="my-8" />

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-zinc-700">AI 分析</h2>
        <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400">
          透镜选择和 AI 分析将在 Day 4 实现
        </div>
      </div>
    </div>
  )
}