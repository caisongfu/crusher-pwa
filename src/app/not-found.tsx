'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center space-y-3">
        <p className="text-8xl font-bold text-zinc-200">404</p>
        <h1 className="text-xl font-semibold text-zinc-900">页面不存在</h1>
        <p className="text-sm text-zinc-500">可能已被删除，或链接有误</p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          返回上一页
        </Button>
        <Button asChild>
          <Link href="/">回到首页</Link>
        </Button>
      </div>
    </div>
  )
}
