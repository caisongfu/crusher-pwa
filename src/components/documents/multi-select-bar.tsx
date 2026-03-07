'use client'

import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import type { Document } from '@/types'
import { calculateCreditCost } from '@/types'

interface MultiSelectBarProps {
  selectedDocs: Document[]
  onAnalyze: () => void
  onClear: () => void
}

export function MultiSelectBar({ selectedDocs, onAnalyze, onClear }: MultiSelectBarProps) {
  if (selectedDocs.length === 0) return null

  const totalChars = selectedDocs.reduce((sum, doc) => sum + doc.char_count, 0)
  const estimatedCost = calculateCreditCost(totalChars)

  return (
    <div className="fixed bottom-16 md:bottom-4 left-0 right-0 z-40 flex justify-center px-4">
      <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white shadow-lg p-3 flex items-center justify-between gap-3">
        <div className="text-xs text-zinc-600 flex-1 min-w-0">
          <span className="font-medium">已选 {selectedDocs.length} 篇</span>
          <span className="mx-1">·</span>
          <span>合并 {totalChars.toLocaleString()} 字</span>
          <span className="mx-1">·</span>
          <span>预计 {estimatedCost} 积分</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" onClick={onAnalyze}>
            开始分析 →
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
