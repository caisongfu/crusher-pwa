'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, FileText, User, Sparkles, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/capture', label: '新建', icon: Plus },
  { href: '/documents', label: '文档', icon: FileText },
  { href: '/profile', label: '我的', icon: User },
  { href: '/lenses', label: '透镜管理', icon: Sparkles },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col fixed inset-y-0 z-30 border-r bg-white pt-14">
      <nav className="flex-1 flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3',
                  isActive && 'bg-zinc-100'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Button>
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Bottom: Recharge Link */}
      <div className="p-4">
        <Link href="/profile">
          <Button variant="outline" className="w-full gap-2">
            <CreditCard className="h-4 w-4" />
            充值积分
          </Button>
        </Link>
      </div>
    </aside>
  )
}
