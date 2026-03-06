import { getCurrentUser, getCurrentProfile, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileTabs } from './profile-tabs'
import { ProfileFeedback } from './profile-feedback'
import { Badge } from '@/components/ui/badge'

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/login')
  }

  const supabase = await createClient()

  // 获取交易记录
  const { data: transactions } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // 获取反馈记录
  const { data: feedbacks } = await supabase
    .from('feedbacks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-zinc-200 flex items-center justify-center text-2xl font-bold text-zinc-600">
            {profile.username?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <h1 className="text-xl font-bold">{profile.username ?? '用户'}</h1>
            <p className="text-zinc-500 text-sm">积分余额：{profile.credits}</p>
          </div>
        </div>
        <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
          {profile.role === 'admin' ? '管理员' : '普通用户'}
        </Badge>
      </div>

      <ProfileTabs
        profile={profile}
        transactions={transactions ?? []}
        feedbacks={feedbacks ?? []}
        email={user.email ?? ''}
      />
    </div>
  )
}
