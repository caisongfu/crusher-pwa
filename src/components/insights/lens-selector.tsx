'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LensType } from '@/types'

const BUILTIN_LENSES: { type: LensType; icon: string; name: string }[] = [
  { type: 'requirements', icon: '📋', name: '甲方需求' },
  { type: 'meeting', icon: '📝', name: '会议纪要' },
  { type: 'review', icon: '🔍', name: '需求评审' },
  { type: 'risk', icon: '⚠️', name: '风险识别' },
  { type: 'change', icon: '📊', name: '变更影响' },
  { type: 'postmortem', icon: '🐛', name: '问题复盘' },
  { type: 'tech', icon: '📖', name: '技术决策' },
]

interface LensSelectorProps {
  onAnalyze: (lensType: LensType) => void
  isLoading: boolean
}

export function LensSelector({ onAnalyze, isLoading }: LensSelectorProps) {
  const [selected, setSelected] = useState<LensType | null>(null)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-700">选择分析透镜</h3>
      <div className="grid grid-cols-4 gap-2 md:grid-cols-7">
        {BUILTIN_LENSES.map((lens) => (
          <button
            key={lens.type}
            onClick={() => setSelected(lens.type)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all',
              selected === lens.type
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white hover:border-zinc-400'
            )}
          >
            <span className="text-xl">{lens.icon}</span>
            <span className="text-xs leading-tight">{lens.name}</span>
          </button>
        ))}
      </div>
      <Button
        onClick={() => selected && onAnalyze(selected)}
        disabled={!selected || isLoading}
        className="w-full"
      >
        {isLoading ? '分析中...' : '开始分析'}
      </Button>
    </div>
  )
}
