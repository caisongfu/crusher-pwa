import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  if (!profile || profile.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Simple Admin TopBar */}
      <header className="fixed top-0 left-0 right-0 z-40 h-14 border-b bg-white">
        <div className="flex items-center justify-between h-full px-4 md:px-6">
          <div className="flex items-center gap-4">
            <span className="text-2xl">🪨</span>
            <span className="font-bold text-lg">Crusher 管理后台</span>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              返回主应用
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="pt-14">
        {children}
      </main>
    </div>
  )
}
