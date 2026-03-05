import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>文档详情</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-16 text-zinc-500">
            文档详情（Day 3 实现）
            <br />
            Document ID: {id}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
