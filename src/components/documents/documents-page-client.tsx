'use client'

import { useState } from 'react'
import { Layers, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DocumentsList } from '@/components/documents/documents-list'
import { MultiSelectBar } from '@/components/documents/multi-select-bar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { Document, LensType } from '@/types'

const LENS_OPTIONS: { value: LensType; label: string }[] = [
  { value: 'requirements', label: '需求分析' },
  { value: 'meeting', label: '会议纪要' },
  { value: 'review', label: '评审分析' },
  { value: 'risk', label: '风险评估' },
  { value: 'change', label: '变更管理' },
  { value: 'postmortem', label: '复盘分析' },
  { value: 'tech', label: '技术文档' },
]

const ASYNC_TIMEOUT_MS = 3000

export function DocumentsPageClient() {
  const router = useRouter()
  const [isMultiSelect, setIsMultiSelect] = useState(false)
  const [selectedDocs, setSelectedDocs] = useState<Document[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedLens, setSelectedLens] = useState<LensType | null>(null)

  const selectedIds = new Set(selectedDocs.map((d) => d.id))

  function handleToggleSelect(doc: Document) {
    setSelectedDocs((prev) =>
      prev.some((d) => d.id === doc.id)
        ? prev.filter((d) => d.id !== doc.id)
        : [...prev, doc]
    )
  }

  function handleClearSelection() {
    setSelectedDocs([])
  }

  function handleExitMultiSelect() {
    setIsMultiSelect(false)
    setSelectedDocs([])
  }

  function resetAnalysisState() {
    setIsAnalyzing(false)
    setSelectedLens(null)
  }

  function dismissDialog() {
    setIsDialogOpen(false)
    setIsMultiSelect(false)
    setSelectedDocs([])
    resetAnalysisState()
  }

  async function handleAnalyze(lensType: LensType) {
    if (selectedDocs.length === 0) return
    setIsAnalyzing(true)
    setSelectedLens(lensType)

    let timeoutFired = false

    const timeoutId = setTimeout(() => {
      timeoutFired = true
      // 关闭弹窗，提示用户稍后查看
      dismissDialog()
      toast.success('分析进行中，稍后在透镜记录中查看结果')
    }, ASYNC_TIMEOUT_MS)

    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: selectedDocs.map((d) => d.id),
          lensType,
        }),
      })

      if (response.status === 402) {
        if (!timeoutFired) {
          clearTimeout(timeoutId)
          toast.error('积分不足，请先充值')
          setIsDialogOpen(false)
          resetAnalysisState()
        }
        return
      }

      if (!response.ok) {
        if (!timeoutFired) {
          clearTimeout(timeoutId)
          const text = await response.text()
          toast.error(text || '分析失败，请重试')
          setIsDialogOpen(false)
          resetAnalysisState()
        }
        return
      }

      // 流式响应：消费完整流（实际分析结果保存到 insights 表）
      const reader = response.body?.getReader()
      if (reader) {
        while (true) {
          const { done } = await reader.read()
          if (done) break
        }
      }

      if (!timeoutFired) {
        clearTimeout(timeoutId)
        toast.success('多文档分析完成！')
        dismissDialog()
        router.push(`/lenses?lensType=${lensType}`)
      }
      // 超时后分析在后台完成，静默处理
    } catch {
      if (!timeoutFired) {
        clearTimeout(timeoutId)
        toast.error('网络错误，请重试')
        resetAnalysisState()
      }
    }
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">我的文档</h1>
            <p className="text-sm text-zinc-500 mt-1">管理你所有的文档和分析结果</p>
            <p className="text-xs text-zinc-400 mt-1">每次分析按字数消耗积分：3千字内 10 积分，6千字内 15 积分，1万字内 30 积分，超出每千字 +5 积分</p>
          </div>
          <Button
            variant={isMultiSelect ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              if (isMultiSelect) {
                handleExitMultiSelect()
              } else {
                setIsMultiSelect(true)
              }
            }}
          >
            <Layers className="h-4 w-4 mr-1" />
            {isMultiSelect ? '退出多选' : '多选分析'}
          </Button>
        </div>

        <DocumentsList
          multiSelectMode={isMultiSelect}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />
      </div>

      {isMultiSelect && (
        <MultiSelectBar
          selectedDocs={selectedDocs}
          onAnalyze={() => {
            if (selectedDocs.length < 2) {
              toast.error('请至少选择 2 篇文档')
              return
            }
            setIsDialogOpen(true)
          }}
          onClear={handleClearSelection}
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open && !isAnalyzing) setIsDialogOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>选择分析透镜</DialogTitle>
            <DialogDescription>
              已选 {selectedDocs.length} 篇文档，选择一个透镜进行合并分析
            </DialogDescription>
          </DialogHeader>
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              <p className="text-sm text-zinc-500">
                正在分析（{LENS_OPTIONS.find((l) => l.value === selectedLens)?.label}）...
              </p>
              <p className="text-xs text-zinc-400">3 秒内未完成将转为后台处理</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2">
              {LENS_OPTIONS.map((lens) => (
                <Button
                  key={lens.value}
                  variant="outline"
                  className="justify-start"
                  onClick={() => handleAnalyze(lens.value)}
                >
                  {lens.label}
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
