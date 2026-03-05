import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProfilePage() {
  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>个人资料</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-16 text-zinc-500">
            个人资料（Day 5 实现）
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
