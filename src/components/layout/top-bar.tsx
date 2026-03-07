'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore, useDocumentsStore, useInsightsStore } from '@/store'
import type { Profile } from '@/types'

interface TopBarProps {
  profile: Profile
}

export function TopBar({ profile }: TopBarProps) {
  const router = useRouter()
  const setProfile = useAuthStore((s) => s.setProfile)
  const setCredits = useAuthStore((s) => s.setCredits)
  const initialize = useAuthStore((s) => s.initialize)

  const resetAuth = useAuthStore((s) => s.reset)
  const resetDocuments = useDocumentsStore((s) => s.reset)
  const resetInsights = useInsightsStore((s) => s.reset)

  // 同步服务器端的profile数据到客户端store
  useEffect(() => {
    setProfile(profile)
    setCredits(profile.credits)
    initialize(profile.id, profile.credits)
  }, [profile, setProfile, setCredits, initialize])

  async function handleLogout() {
    const supabase = createClient()
    resetAuth()
    resetDocuments()
    resetInsights()
    await supabase.auth.signOut()
    toast.success('已退出登录')
    router.push('/login')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 md:h-14 border-b bg-white">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Image src="/logo.webp" alt="Crusher" width={32} height={32} />
          <span className="hidden sm:inline">Crusher</span>
        </Link>

        {/* Right: Credits + User Menu */}
        <div className="flex items-center gap-3">
          {/* Credits Badge */}
          <Badge variant="secondary" className="text-sm font-medium">
            {profile.credits} 积分
          </Badge>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {profile.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {profile.username || '用户'}
                  </span>
                  <span className="text-xs text-zinc-500">{profile.role}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
