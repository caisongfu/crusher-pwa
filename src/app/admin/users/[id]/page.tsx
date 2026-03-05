// src/app/admin/users/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminCreditForm } from './admin-credit-form'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient as createServiceClient } from '@supabase/supabase-js'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!adminProfile || (adminProfile as any).role !== 'admin') redirect('/')

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 获取目标用户资料
  const { data: targetProfile } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!targetProfile) redirect('/admin')

  // 获取该用户的积分流水
  const { data: transactions } = await serviceClient
    .from('credit_transactions')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">用户详情</h1>
        <a href="/admin" className="text-sm text-muted-foreground hover:underline">
          ← 返回用户列表
        </a>
      </div>

      {/* 用户基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">用户 ID</span>
            <span className="font-mono text-sm">{targetProfile.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">用户名</span>
            <span>{targetProfile.username ?? '未设置'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">角色</span>
            <Badge variant={targetProfile.role === 'admin' ? 'default' : 'secondary'}>
              {targetProfile.role === 'admin' ? '管理员' : '普通用户'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">注册时间</span>
            <span>{format(new Date(targetProfile.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">当前积分</span>
            <span className="text-2xl font-bold">{targetProfile.credits}</span>
          </div>
        </CardContent>
      </Card>

      {/* 手动调整积分 */}
      <AdminCreditForm userId={id} currentBalance={targetProfile.credits} />

      {/* 积分流水 */}
      <Card>
        <CardHeader>
          <CardTitle>积分流水</CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">暂无记录</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-4 text-xs text-muted-foreground pb-2 border-b">
                <span>时间</span>
                <span>类型</span>
                <span className="text-right">金额</span>
                <span className="text-right">余额</span>
              </div>
              {transactions.map((tx) => (
                <div key={tx.id} className="grid grid-cols-4 text-sm py-2 border-b last:border-0">
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(tx.created_at), 'MM-dd HH:mm', { locale: zhCN })}
                  </span>
                  <span className="text-xs">{tx.description ?? tx.type}</span>
                  <span className={`text-right font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                  <span className="text-right text-muted-foreground">{tx.balance_after}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
