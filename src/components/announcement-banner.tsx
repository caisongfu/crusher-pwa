'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Announcement, AnnouncementType } from '@/types'

const TYPE_STYLES: Record<AnnouncementType, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-orange-50 border-orange-200 text-orange-800',
  maintenance: 'bg-red-50 border-red-200 text-red-800',
}

const TYPE_ICONS: Record<AnnouncementType, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  maintenance: '🔴',
}

interface AnnouncementBannerProps {
  announcements: Announcement[]
}

export function AnnouncementBanner({ announcements }: AnnouncementBannerProps) {
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    // 从 localStorage 读取已关闭的公告 ID
    try {
      const stored = localStorage.getItem('crusher_dismissed_announcements')
      if (stored) setDismissed(JSON.parse(stored))
    } catch {
      // 忽略
    }
  }, [])

  function dismiss(id: string) {
    const next = [...dismissed, id]
    setDismissed(next)
    try {
      localStorage.setItem('crusher_dismissed_announcements', JSON.stringify(next))
    } catch {
      // 忽略
    }
  }

  const visible = announcements.filter(a => !dismissed.includes(a.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-1">
      {visible.map((announcement) => (
        <div
          key={announcement.id}
          className={cn(
            'flex items-center gap-3 px-4 py-2 border text-sm',
            TYPE_STYLES[announcement.type]
          )}
        >
          <span>{TYPE_ICONS[announcement.type]}</span>
          <span className="flex-1">{announcement.content}</span>
          <button
            onClick={() => dismiss(announcement.id)}
            className="shrink-0 opacity-60 hover:opacity-100"
            aria-label="关闭公告"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
