import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-8">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-xl font-semibold mb-2">还没有文档</h2>
          <p className="text-zinc-500 mb-6">点击新建开始创建你的第一份文档</p>
          <Link href="/capture">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              新建文档
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
