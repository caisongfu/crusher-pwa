// src/components/copy-buttons.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { copyAsMarkdown, copyAsPlainText, copyAsRichText } from '@/lib/copy'
import { toast } from 'sonner'

interface CopyButtonsProps {
  content: string
  className?: string
}

type CopyFormat = 'markdown' | 'plain' | 'rich'

// 每种格式的配置
const FORMATS: {
  key: CopyFormat
  label: string
  icon: string
  fn: (content: string) => Promise<void>
  httpsOnly?: boolean
}[] = [
  { key: 'markdown', label: 'Markdown', icon: '📋', fn: copyAsMarkdown },
  { key: 'plain',    label: '纯文本',   icon: '📄', fn: copyAsPlainText },
  { key: 'rich',     label: '富文本',   icon: '✨', fn: copyAsRichText, httpsOnly: true },
]

export function CopyButtons({ content, className }: CopyButtonsProps) {
  const [copied, setCopied] = useState<CopyFormat | null>(null)

  // 检测是否 HTTPS（rich text 需要 ClipboardItem API）
  const isHttps = typeof window !== 'undefined' && (
    window.location.protocol === 'https:' || window.location.hostname === 'localhost'
  )

  const handleCopy = async (format: typeof FORMATS[0]) => {
    if (format.httpsOnly && !isHttps) {
      toast.error('富文本复制需要 HTTPS 环境')
      return
    }

    try {
      await format.fn(content)
      setCopied(format.key)
      toast.success(`已复制为${format.label}格式`)
      // 0.5 秒后恢复按钮状态
      setTimeout(() => setCopied(null), 500)
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      {FORMATS.map((format) => {
        const isCopied = copied === format.key
        const isDisabled = format.httpsOnly && !isHttps

        return (
          <Button
            key={format.key}
            variant="outline"
            size="sm"
            onClick={() => handleCopy(format)}
            disabled={isDisabled}
            title={isDisabled ? '需要 HTTPS 环境' : `复制为${format.label}`}
            className="text-xs gap-1"
          >
            {isCopied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <span>{format.icon}</span>
            )}
            {isCopied ? '已复制' : format.label}
          </Button>
        )
      })}
    </div>
  )
}
