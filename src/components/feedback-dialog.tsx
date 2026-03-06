'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FeedbackType } from '@/types'

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: string }[] = [
  { value: 'payment', label: '支付问题', icon: '💳' },
  { value: 'bug', label: 'Bug 报告', icon: '🐛' },
  { value: 'feature', label: '功能建议', icon: '💡' },
  { value: 'other', label: '其他', icon: '📝' },
]

const schema = z.object({
  type: z.enum(['payment', 'bug', 'feature', 'other']),
  title: z.string().min(1, '标题必填').max(100, '最多100字'),
  content: z.string().min(1, '详情必填').max(2000, '最多2000字'),
})

type FormValues = z.infer<typeof schema>

interface FeedbackDialogProps {
  trigger?: React.ReactNode
  defaultType?: FeedbackType
  defaultContextUrl?: string
  defaultRelatedOrderId?: string
  defaultRelatedInsightId?: string
  onSuccess?: () => void
}

export function FeedbackDialog({
  trigger,
  defaultType = 'other',
  defaultContextUrl,
  defaultRelatedOrderId,
  defaultRelatedInsightId,
  onSuccess,
}: FeedbackDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: defaultType, title: '', content: '' },
  })

  const content = form.watch('content')

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          context_url: defaultContextUrl ?? null,
          related_order_id: defaultRelatedOrderId ?? null,
          related_insight_id: defaultRelatedInsightId ?? null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? '提交失败')
      }

      toast.success('反馈已提交，感谢您的反馈！')
      setOpen(false)
      form.reset()
      onSuccess?.()
    } catch {
      toast.error('提交失败，请稍后再试')
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">提交反馈</Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>提交反馈</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type Selector */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>类型 <span className="text-red-500">*</span></FormLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {FEEDBACK_TYPES.map(({ value, label, icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className={cn(
                          'flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors',
                          field.value === value
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 hover:border-zinc-400'
                        )}
                      >
                        <span className="text-lg">{icon}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标题 <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="一句话描述问题" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>详情 <span className="text-red-500">*</span></FormLabel>
                    <span className="text-xs text-zinc-400">{content.length}/2000</span>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="请详细描述您遇到的问题或建议..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Context Info (read-only) */}
            {(defaultContextUrl || defaultRelatedOrderId || defaultRelatedInsightId) && (
              <div className="text-xs text-zinc-400 bg-zinc-50 rounded p-2 space-y-1">
                <p className="font-medium">关联信息（自动填充）</p>
                {defaultContextUrl && <p>页面：{defaultContextUrl}</p>}
                {defaultRelatedOrderId && <p>订单号：{defaultRelatedOrderId}</p>}
                {defaultRelatedInsightId && <p>分析 ID：{defaultRelatedInsightId}</p>}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '提交中...' : '提交'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
