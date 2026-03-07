'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const router = useRouter()

  useEffect(() => {
    console.error('页面错误:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center space-y-3">
        <AlertCircle className="h-16 w-16 text-zinc-300 mx-auto" />
        <h1 className="text-xl font-semibold text-zinc-900">页面出现了一点问题</h1>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-red-500 font-mono max-w-md break-all">
            {error.message}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          返回上一页
        </Button>
        <Button onClick={reset}>
          重试
        </Button>
      </div>
    </div>
  )
}
