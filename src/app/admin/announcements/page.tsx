'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { Announcement, AnnouncementType } from '@/types'

const TYPE_STYLES: Record<AnnouncementType, string> = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-orange-100 text-orange-800',
  maintenance: 'bg-red-100 text-red-800',
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'info' as AnnouncementType,
    expires_at: '',
  })

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  async function fetchAnnouncements() {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
      setAnnouncements(data ?? [])
    } catch {
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!form.title || !form.content) {
      toast.error('标题和内容必填')
      return
    }
    setCreating(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.from('announcements').insert({
        title: form.title,
        content: form.content,
        type: form.type,
        expires_at: form.expires_at || null,
      })
      if (error) throw error
      toast.success('公告已创建')
      setCreateOpen(false)
      setForm({ title: '', content: '', type: 'info', expires_at: '' })
      fetchAnnouncements()
    } catch {
      toast.error('创建失败')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeactivate(id: string) {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
      toast.success('公告已停用')
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_active: false } : a))
    } catch {
      toast.error('操作失败')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">系统公告</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              新建公告
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建公告</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">标题</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="公告标题"
                />
              </div>
              <div>
                <label className="text-sm font-medium">内容</label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="公告内容（显示在横幅上）"
                />
              </div>
              <div>
                <label className="text-sm font-medium">类型</label>
                <div className="flex gap-2 mt-1">
                  {(['info', 'warning', 'maintenance'] as AnnouncementType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`px-3 py-1 rounded text-sm border ${
                        form.type === t ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">到期时间（可选）</label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? '创建中...' : '创建'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-zinc-400">加载中...</p>
      ) : (
        <div className="border rounded-lg divide-y bg-white">
          {announcements.length === 0 && (
            <p className="text-zinc-400 text-center py-8">暂无公告</p>
          )}
          {announcements.map((announcement) => (
            <div key={announcement.id} className="flex items-center gap-4 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{announcement.title}</p>
                  <Badge className={TYPE_STYLES[announcement.type]}>
                    {announcement.type}
                  </Badge>
                  {!announcement.is_active && (
                    <Badge className="bg-zinc-100 text-zinc-500">已停用</Badge>
                  )}
                </div>
                <p className="text-sm text-zinc-500 mt-1">{announcement.content}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  创建：{new Date(announcement.created_at).toLocaleString('zh-CN')}
                  {announcement.expires_at && ` · 到期：${new Date(announcement.expires_at).toLocaleString('zh-CN')}`}
                </p>
              </div>
              {announcement.is_active && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeactivate(announcement.id)}
                >
                  停用
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
