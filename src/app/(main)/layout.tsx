import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentProfile, createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/top-bar'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { FeedbackButton } from '@/components/feedback-button'
import { AnnouncementBanner } from '@/components/announcement-banner'
import type { Announcement } from '@/types'

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

  // 查询公告
  const supabase = await createClient()
  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* TopBar */}
      <TopBar profile={profile} />

      {/* Sidebar (PC only) */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 md:ml-60 pt-14 pb-16 md:pb-0">
        <AnnouncementBanner announcements={announcements ?? []} />
        {children}
      </main>

      {/* BottomNav (Mobile only) */}
      <BottomNav />

      {/* Feedback Button (Floating) */}
      <FeedbackButton />
    </div>
  )
}
