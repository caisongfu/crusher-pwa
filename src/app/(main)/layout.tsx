import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentProfile, createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/top-bar'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 先验证身份，未登录才重定向到 /login（避免与 middleware 形成死循环）
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  // 获取用户 profile（如果不存在，Supabase trigger 会自动创建）
  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* TopBar */}
      <TopBar profile={profile} />

      {/* Sidebar (PC only) */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 md:ml-60 pt-14 pb-16 md:pb-0">
        {children}
      </main>

      {/* BottomNav (Mobile only) */}
      <BottomNav />
    </div>
  )
}
