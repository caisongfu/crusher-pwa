import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/top-bar'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
