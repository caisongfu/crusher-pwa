'use client'

import { useState } from 'react'
import { Layers } from 'lucide-react'
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

export function DocumentsPageClient() {
  const router = useRouter()
  const [isMultiSelect, setIsMultiSelect] = useState(false)
  const [selectedDocs, setSelectedDocs] = useState<Document[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

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

  async function handleAnalyze(lensType: LensType) {
    if (selectedDocs.length === 0) return
    setIsAnalyzing(true)
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
        toast.error('积分不足，请先充值')
        setIsDialogOpen(false)
        return
      }

      if (!response.ok) {
        const text = await response.text()
        toast.error(text || '分析失败，请重试')
        setIsDialogOpen(false)
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

      toast.success('多文档分析完成！')
      setIsDialogOpen(false)
      setIsMultiSelect(false)
      setSelectedDocs([])
      // 跳转到透镜记录页查看结果
      router.push(`/lenses?lensType=${lensType}`)
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">我的文档</h1>
            <p className="text-sm text-zinc-500 mt-1">管理你所有的文档和分析结果</p>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>选择分析透镜</DialogTitle>
            <DialogDescription>
              已选 {selectedDocs.length} 篇文档，选择一个透镜进行合并分析
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-2">
            {LENS_OPTIONS.map((lens) => (
              <Button
                key={lens.value}
                variant="outline"
                className="justify-start"
                disabled={isAnalyzing}
                onClick={() => handleAnalyze(lens.value)}
              >
                {isAnalyzing ? '分析中...' : lens.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
