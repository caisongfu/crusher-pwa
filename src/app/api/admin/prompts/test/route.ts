import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { streamText } from 'ai'
import { deepseekModel } from '@/lib/deepseek'
import { z } from 'zod'

// 请求参数验证
const TestPromptSchema = z.object({
  lensType: z.string(),
  testInput: z.string().min(1, '测试文本不能为空'),
  systemPrompt: z.string().min(10, 'Prompt 内容不能少于 10 个字符'),
})

export async function POST(req: NextRequest) {
  try {
    // 验证管理员权限
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 解析和验证请求参数
    const body = await req.json()
    const validatedData = TestPromptSchema.parse(body)

    // 调用 DeepSeek API 测试 Prompt
    const result = streamText({
      model: deepseekModel as any,
      system: validatedData.systemPrompt,
      prompt: `请分析以下内容：\n\n${validatedData.testInput}`,
      maxTokens: 1000,
    })

    // 返回流式响应
    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Prompt 测试 API 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
