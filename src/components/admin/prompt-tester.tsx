'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Play, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'

interface PromptTesterProps {
  lensType: string
  systemPrompt: string
}

export function PromptTester({ lensType, systemPrompt }: PromptTesterProps) {
  const [testInput, setTestInput] = useState('')
  const [testResult, setTestResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleTest = async () => {
    if (!testInput.trim()) {
      toast.error('请输入测试文本')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/prompts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lensType, testInput, systemPrompt }),
      })

      const data = await response.json()

      if (response.ok) {
        setTestResult(data.result)
        toast.success('测试完成')
      } else {
        toast.error(data.error || '测试失败')
      }
    } catch (error) {
      console.error('测试 Prompt 失败:', error)
      toast.error('测试失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>测试 Prompt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            测试文本
          </label>
          <Textarea
            placeholder="请输入用于测试的文本..."
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            rows={6}
          />
        </div>

        <Button onClick={handleTest} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              测试中...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              测试 Prompt
            </>
          )}
        </Button>

        {testResult && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-3">测试结果：</h3>
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight]}
              className="prose prose-sm max-w-none"
            >
              {testResult}
            </ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
