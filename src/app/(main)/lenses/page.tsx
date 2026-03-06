'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LensForm } from '@/components/lens-form'
import type { CustomLens } from '@/types'

// 内置透镜（只读展示）
const BUILT_IN_LENSES = [
  { icon: '📋', name: '甲方需求整理' },
  { icon: '📝', name: '会议纪要' },
  { icon: '🔍', name: '需求评审' },
  { icon: '⚠️', name: '风险识别' },
  { icon: '📊', name: '变更影响分析' },
  { icon: '🐛', name: '问题复盘' },
  { icon: '📖', name: '技术决策记录' },
]

export default function LensesPage() {
  const [lenses, setLenses] = useState<CustomLens[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLenses = useCallback(async () => {
    try {
      const res = await fetch('/api/lenses')
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      setLenses(data ?? [])
    } catch {
      toast.error('加载透镜列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLenses() }, [fetchLenses])

  async function handleDelete(id: string) {
    if (!confirm('确定删除这个透镜吗？')) return
    try {
      const res = await fetch(`/api/lenses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('删除失败')
      toast.success('透镜已删除')
      setLenses(prev => prev.filter(l => l.id !== id))
    } catch {
      toast.error('删除失败')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">透镜管理</h1>
        <LensForm
          trigger={
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              新建自定义透镜
            </Button>
          }
          onSuccess={fetchLenses}
        />
      </div>

      {/* Custom Lenses */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
          我的自定义透镜
        </h2>
        {loading ? (
          <p className="text-zinc-400 text-sm">加载中...</p>
        ) : lenses.length === 0 ? (
          <p className="text-zinc-400 text-sm">还没有自定义透镜，点击右上角新建一个</p>
        ) : (
          <ul className="space-y-2">
            {lenses.map((lens) => (
              <li
                key={lens.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-white"
              >
                <span className="text-2xl">{lens.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{lens.name}</p>
                  {lens.description && (
                    <p className="text-sm text-zinc-400 truncate">{lens.description}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <LensForm
                    lens={lens}
                    trigger={
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                    onSuccess={fetchLenses}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(lens.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Built-in Lenses (read-only) */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
          内置透镜（只读）
        </h2>
        <ul className="space-y-2">
          {BUILT_IN_LENSES.map((lens) => (
            <li
              key={lens.name}
              className="flex items-center gap-3 p-3 border rounded-lg bg-zinc-50 text-zinc-500"
            >
              <span className="text-2xl">{lens.icon}</span>
              <p className="font-medium">{lens.name}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
