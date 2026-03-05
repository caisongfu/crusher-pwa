import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function CapturePage() {
  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>新建文档</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-16 text-zinc-500">
            输入区域（Day 3 实现）
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
