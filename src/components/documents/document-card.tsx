// src/components/documents/document-card.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { FileText, Mic, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useDocumentsStore } from '@/store'
import type { Document } from '@/types'

interface DocumentCardProps {
  document: Document
  disableLink?: boolean
  onCardClick?: () => void
}

export function DocumentCard({ document, disableLink = false, onCardClick }: DocumentCardProps) {
  const removeDocument = useDocumentsStore((s) => s.removeDocument)
  const [isDeleting, setIsDeleting] = useState(false)

  const displayTitle = document.title ?? document.raw_content.slice(0, 50)
  const preview = document.raw_content.slice(0, 120)
  const hasMore = document.raw_content.length > 120

  const timeAgo = formatDistanceToNow(new Date(document.created_at), {
    addSuffix: true,
    locale: zhCN,
  })

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        toast.error(result.error ?? '删除失败，请重试')
        return
      }
      removeDocument(document.id)
      toast.success('文档已删除')
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          {disableLink ? (
            <button
              type="button"
              onClick={onCardClick}
              className="flex-1 min-w-0 space-y-1 text-left"
            >
              <div className="flex items-center gap-2">
                {document.source_type === 'voice' ? (
                  <Mic className="h-4 w-4 text-zinc-400 shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                )}
                <h3 className="font-medium text-sm line-clamp-1">
                  {displayTitle}
                </h3>
              </div>
              <p className="text-xs text-zinc-500 line-clamp-2">
                {preview}{hasMore && '…'}
              </p>
              <p className="text-xs text-zinc-400">{timeAgo}</p>
            </button>
          ) : (
            <Link href={`/documents/${document.id}`} className="flex-1 min-w-0 space-y-1 group">
              <div className="flex items-center gap-2">
                {document.source_type === 'voice' ? (
                  <Mic className="h-4 w-4 text-zinc-400 shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                )}
                <h3 className="font-medium text-sm line-clamp-1 group-hover:underline">
                  {displayTitle}
                </h3>
              </div>
              <p className="text-xs text-zinc-500 line-clamp-2">
                {preview}{hasMore && '…'}
              </p>
              <p className="text-xs text-zinc-400">{timeAgo}</p>
            </Link>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-destructive shrink-0"
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">删除</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作将删除文档「{displayTitle.slice(0, 30)}」，删除后无法恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? '删除中...' : '确认删除'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}