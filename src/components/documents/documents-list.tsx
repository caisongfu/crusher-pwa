// src/components/documents/documents-list.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { PlusCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocumentCard } from './document-card'
import { useDocumentsStore } from '@/store'

export function DocumentsList() {
  const { documents, total, isLoading, setDocuments } = useDocumentsStore()

  useEffect(() => {
    if (documents.length === 0 && !isLoading) {
      fetchDocuments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchDocuments() {
    useDocumentsStore.setState({ isLoading: true })
    try {
      const response = await fetch('/api/documents?page=1&limit=20')
      const result = await response.json()
      if (result.success) {
        setDocuments(result.data, result.meta.total)
      }
    } catch {
      // 静默失败，用户可刷新重试
    } finally {
      useDocumentsStore.setState({ isLoading: false })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="text-5xl">📄</div>
        <p className="text-zinc-500">还没有文档，点击下方开始</p>
        <Button asChild>
          <Link href="/capture">
            <PlusCircle className="h-4 w-4 mr-2" />
            新建文档
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
      {total > documents.length && (
        <p className="text-center text-xs text-zinc-400 py-4">
          共 {total} 篇文档，当前显示 {documents.length} 篇
        </p>
      )}
    </div>
  )
}