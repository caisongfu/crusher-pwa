import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminPage() {
  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">管理后台</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>用户管理</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Day 7-8 实现</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>支付订单</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Day 7-8 实现</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>用量统计</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Day 7-8 实现</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompt 管理</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Day 8 实现</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>公告管理</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Day 8 实现</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>反馈管理</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Day 8 实现</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
