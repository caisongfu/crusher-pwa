'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { PromptEditor } from '@/components/admin/prompt-editor'
import { PromptTester } from '@/components/admin/prompt-tester'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, Check } from 'lucide-react'

const lensTypes = [
  { value: 'requirements', label: '📋 甲方需求整理' },
  { value: 'meeting', label: '📝 会议纪要' },
  { value: 'review', label: '🔍 需求评审' },
  { value: 'risk', label: '⚠️ 风险识别' },
  { value: 'change', label: '📊 变更影响分析' },
  { value: 'postmortem', label: '🐛 问题复盘' },
  { value: 'tech', label: '📖 技术决策记录' },
]

interface PromptVersion {
  id: string
  version: string
  lens_type: string
  system_prompt: string
  is_active: boolean
  notes: string | null
  created_by: string
  created_at: string
}

export default function AdminPromptsPage() {
  const [selectedLensType, setSelectedLensType] = useState('requirements')
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [activeVersion, setActiveVersion] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 创建/编辑表单
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newPrompt, setNewPrompt] = useState('')
  const [newNotes, setNewNotes] = useState('')

  // 编辑表单
  const [editingVersion, setEditingVersion] = useState<PromptVersion | null>(null)

  // 加载版本列表
  useEffect(() => {
    loadVersions()
  }, [selectedLensType])

  const loadVersions = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/prompts?lensType=${selectedLensType}`
      )
      const data = await response.json()

      if (response.ok) {
        setVersions(data.versions)
        setActiveVersion(data.activeVersion)
      } else {
        toast.error(data.error || '加载版本列表失败')
      }
    } catch (error) {
      console.error('加载版本列表失败:', error)
      toast.error('加载版本列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 创建新版本
  const handleCreateVersion = async () => {
    if (!newPrompt.trim()) {
      toast.error('请输入 Prompt 内容')
      return
    }

    try {
      const response = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lensType: selectedLensType,
          systemPrompt: newPrompt,
          notes: newNotes,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('新版本已创建')
        setIsCreateDialogOpen(false)
        setNewPrompt('')
        setNewNotes('')
        loadVersions()
      } else {
        toast.error(data.error || '创建失败')
      }
    } catch (error) {
      console.error('创建版本失败:', error)
      toast.error('创建版本失败')
    }
  }

  // 激活版本
  const handleActivateVersion = async (versionId: string) => {
    if (!confirm('确定要激活此版本吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/prompts/${versionId}`, {
        method: 'PATCH',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('版本已激活')
        loadVersions()
      } else {
        toast.error(data.error || '激活失败')
      }
    } catch (error) {
      console.error('激活版本失败:', error)
      toast.error('激活版本失败')
    }
  }

  // 删除版本
  const handleDeleteVersion = async (versionId: string) => {
    if (!confirm('确定要删除此版本吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/prompts/${versionId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('版本已删除')
        loadVersions()
      } else {
        toast.error(data.error || '删除失败')
      }
    } catch (error) {
      console.error('删除版本失败:', error)
      toast.error('删除版本失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Prompt 版本管理</h2>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新建版本
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建 Prompt 版本</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>透镜类型</Label>
                <select 
                  value={selectedLensType} 
                  onChange={(e) => setSelectedLensType(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  {lensTypes.map((lens) => (
                    <option key={lens.value} value={lens.value}>
                      {lens.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Prompt 内容</Label>
                <Textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="请输入 Prompt 内容..."
                  rows={10}
                />
              </div>
              <div>
                <Label>变更说明</Label>
                <Textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="请填写变更说明..."
                  rows={3}
                />
              </div>
              <Button onClick={handleCreateVersion} className="w-full">创建</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 透镜类型选择 */}
      <select 
        value={selectedLensType} 
        onChange={(e) => setSelectedLensType(e.target.value)}
        className="w-full p-2 border rounded-md"
      >
        {lensTypes.map((lens) => (
          <option key={lens.value} value={lens.value}>
            {lens.label}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 版本列表 */}
        <Card>
          <CardHeader>
            <CardTitle>
              版本历史
              {activeVersion && (
                <span className="ml-2 text-sm text-gray-500">
                  当前激活：{activeVersion}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>加载中...</div>
            ) : versions.length === 0 ? (
              <div>暂无版本</div>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{version.version}</span>
                        {version.is_active && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                            激活中
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {version.notes || '无变更说明'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(version.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingVersion(version)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!version.is_active && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivateVersion(version.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVersion(version.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 编辑和测试 */}
        <div className="space-y-6">
          {editingVersion && (
            <Card>
              <CardHeader>
                <CardTitle>编辑版本 {editingVersion.version}</CardTitle>
              </CardHeader>
              <CardContent>
                <PromptEditor
                  value={editingVersion.system_prompt}
                  onChange={(value) =>
                    setEditingVersion({
                      ...editingVersion,
                      system_prompt: value,
                    })
                  }
                />
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => setEditingVersion(null)}>
                    关闭
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {editingVersion && (
            <PromptTester
              lensType={selectedLensType}
              systemPrompt={editingVersion.system_prompt}
            />
          )}
        </div>
      </div>
    </div>
  )
}
