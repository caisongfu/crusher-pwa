'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, FileText, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/capture', label: '新建', icon: Plus },
  { href: '/documents', label: '文档', icon: FileText },
  { href: '/profile', label: '我的', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 h-14 border-t bg-white">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 text-xs',
              isActive ? 'text-zinc-900' : 'text-zinc-500'
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
