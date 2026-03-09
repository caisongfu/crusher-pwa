// src/components/documents/capture-form.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { VoiceButton } from './voice-button'
import { useAuthStore } from '@/store'
import { useDocumentsStore } from '@/store'
import { calculateCreditCost } from '@/types'

const MAX_CHARS = 50000

export function CaptureForm() {
  const router = useRouter()
  const profile = useAuthStore((s) => s.profile)
  const prependDocument = useDocumentsStore((s) => s.prependDocument)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const charCount = content.length
  const creditCost = charCount > 0 ? calculateCreditCost(charCount) : 0
  const availableCredits = profile?.credits ?? 0
  const canAfford = availableCredits >= creditCost
  const isContentEmpty = charCount === 0
  const isOverLimit = charCount > MAX_CHARS
  const submitDisabled = isSubmitting || isContentEmpty || !canAfford || isOverLimit

  const handleTranscript = useCallback((text: string) => {
    setContent((prev) => {
      const separator = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : ''
      return prev + separator + text
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitDisabled) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          raw_content: content,
          source_type: 'text',
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error ?? '创建失败，请重试')
        return
      }

      prependDocument({
        id: result.data.id,
        user_id: profile?.id ?? '',
        title: result.data.title,
        raw_content: content,
        char_count: content.length,
        source_type: 'text',
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      toast.success('文档已创建')
      router.push(`/documents/${result.data.id}`)
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">标题（可选）</Label>
        <Input
          id="title"
          placeholder="AI 将自动生成摘要标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="content">原始内容</Label>
        <Textarea
          id="content"
          placeholder="粘贴或输入你想分析的文字……"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[160px] md:min-h-[200px] resize-y"
        />
        {isOverLimit && (
          <p className="text-xs text-destructive">
            内容超过 {MAX_CHARS.toLocaleString()} 字上限，请截断后再提交
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-500">
        <VoiceButton onTranscript={handleTranscript} disabled={isSubmitting} />
        <div className="flex items-center gap-3">
          <span>{charCount.toLocaleString()} 字</span>
          <span>新建消耗 {creditCost} 积分</span>
          <span className={!canAfford && !isContentEmpty ? 'text-destructive font-medium' : ''}>
            剩余 {availableCredits} 积分
          </span>
        </div>
      </div>

      {!canAfford && !isContentEmpty && (
        <p className="text-sm text-destructive">
          积分不足，请{' '}
          <Link href="/profile" className="underline font-medium">
            前往充值
          </Link>
        </p>
      )}

      <Button type="submit" disabled={submitDisabled} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            提交中...
          </>
        ) : (
          '提交'
        )}
      </Button>
    </form>
  )
}