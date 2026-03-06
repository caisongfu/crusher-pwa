'use client'

import { useState, useEffect } from 'react'
import { AnnouncementBanner } from '@/components/announcement-banner'
import { DocumentsList } from '@/components/documents/documents-list'

export function HomePageContent() {
  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    // 加载公告数据
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcements')
        const data = await response.json()
        if (response.ok) {
          setAnnouncements(data.announcements || [])
        }
      } catch (error) {
        console.error('加载公告失败:', error)
      }
    }

    fetchAnnouncements()
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* 公告横幅 */}
      {announcements.length > 0 && <AnnouncementBanner announcements={announcements} />}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">我的文档</h1>
      </div>
      <DocumentsList />
    </div>
  )
}
