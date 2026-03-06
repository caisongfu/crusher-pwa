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
import type { CustomLens } from '@/types'

const COMMON_EMOJIS = ['🔧', '📊', '✍️', '🎯', '📌', '💡', '🔍', '📝', '⚡', '🚀',
  '🌟', '🎨', '📋', '🔬', '💼', '📈', '🎭', '🧩', '🔮', '🌈']

const schema = z.object({
  name: z.string().min(1, '名称必填').max(50, '最多50字'),
  icon: z.string().default('🔧'),
  description: z.string().max(200, '最多200字').optional(),
  system_prompt: z.string().min(10, '系统提示词至少10字').max(5000, '最多5000字'),
})

type FormValues = z.infer<typeof schema>

interface LensFormProps {
  lens?: CustomLens           // 编辑时传入；不传则为创建
  trigger: React.ReactNode
  onSuccess: () => void
}

export function LensForm({ lens, trigger, onSuccess }: LensFormProps) {
  const [open, setOpen] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const isEditing = !!lens

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: lens?.name ?? '',
      icon: lens?.icon ?? '🔧',
      description: lens?.description ?? '',
      system_prompt: lens?.system_prompt ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      const url = isEditing ? `/api/lenses/${lens.id}` : '/api/lenses'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? '操作失败')
      }

      toast.success(isEditing ? '透镜已更新' : '透镜已创建')
      setOpen(false)
      form.reset()
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑透镜' : '新建自定义透镜'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Icon Picker */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>图标</FormLabel>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                      className="text-2xl border rounded p-2 hover:bg-zinc-50"
                    >
                      {field.value}
                    </button>
                    {emojiPickerOpen && (
                      <div className="flex flex-wrap gap-1 p-2 border rounded bg-white shadow-sm max-w-48">
                        {COMMON_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="text-xl hover:bg-zinc-100 rounded p-1"
                            onClick={() => {
                              field.onChange(emoji)
                              setEmojiPickerOpen(false)
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                        <Input
                          placeholder="其他"
                          className="h-8 w-20 text-center"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const val = (e.target as HTMLInputElement).value
                              if (val) {
                                field.onChange(val)
                                setEmojiPickerOpen(false)
                              }
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </FormItem>
              )}
            />

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名称 <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="周报整理" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述（可选）</FormLabel>
                  <FormControl>
                    <Input placeholder="简短描述这个透镜的用途" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* System Prompt */}
            <FormField
              control={form.control}
              name="system_prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="你是一个...请帮我分析以下内容：&#10;&#10;{content}"
                      className="min-h-[120px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-zinc-400">使用 {'{content}'} 作为内容占位符</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
