import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// 请求参数验证
const GetPromptsSchema = z.object({
  lensType: z.enum([
    'requirements',
    'meeting',
    'review',
    'risk',
    'change',
    'postmortem',
    'tech',
  ]),
})

export async function GET(req: NextRequest) {
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
      .single() as any

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 解析和验证请求参数
    const { searchParams } = new URL(req.url)
    const params = GetPromptsSchema.parse(Object.fromEntries(searchParams))

    // 查询 Prompt 版本列表
    const { data: versions, error } = await (supabase as any)
      .from('system_prompts')
      .select('*')
      .eq('lens_type', params.lensType)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('查询 Prompt 版本列表失败:', error)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    // 查询当前激活版本
    const { data: activeVersion } = await (supabase as any)
      .from('system_prompts')
      .select('version')
      .eq('lens_type', params.lensType)
      .eq('is_active', true)
      .single() as any

    return NextResponse.json({
      versions: versions || [],
      activeVersion: activeVersion?.version || null,
    })
  } catch (error) {
    console.error('Prompt 列表 API 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 创建新 Prompt 版本
const CreatePromptSchema = z.object({
  lensType: z.enum([
    'requirements',
    'meeting',
    'review',
    'risk',
    'change',
    'postmortem',
    'tech',
  ]),
  systemPrompt: z.string().min(10, 'Prompt 内容不能少于 10 个字符'),
  notes: z.string().optional(),
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
      .single() as any

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 解析和验证请求参数
    const body = await req.json()
    const validatedData = CreatePromptSchema.parse(body)

    // 生成新版本号
    const { data: existingVersions } = await (supabase as any)
      .from('system_prompts')
      .select('version')
      .eq('lens_type', validatedData.lensType)

    const versionCount = existingVersions?.length || 0
    const newVersion = `v${versionCount + 1}`

    // 创建新 Prompt 版本（默认不激活）
    const { data: createdPrompt, error } = await (supabase as any)
      .from('system_prompts')
      .insert({
        lens_type: validatedData.lensType,
        version: newVersion,
        system_prompt: validatedData.systemPrompt,
        notes: validatedData.notes,
        is_active: false,
        created_by: user.id,
      })
      .select()
      .single() as any

    if (error || !createdPrompt) {
      console.error('创建 Prompt 版本失败:', error)
      return NextResponse.json({ error: '创建失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      version: createdPrompt,
      message: '新版本已创建，请手动激活',
    })
  } catch (error) {
    console.error('创建 Prompt API 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
