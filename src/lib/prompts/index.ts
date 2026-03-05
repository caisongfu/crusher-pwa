import { createClient } from '@/lib/supabase/server'
import type { LensType } from '@/types'

import { requirementsPrompt } from './requirements'
import { meetingPrompt } from './meeting'
import { reviewPrompt } from './review'
import { riskPrompt } from './risk'
import { changePrompt } from './change'
import { postmortemPrompt } from './postmortem'
import { techPrompt } from './tech'

// 内置 prompt 映射
const builtinPrompts: Record<string, { system: string; userTemplate: string }> = {
  requirements: requirementsPrompt,
  meeting: meetingPrompt,
  review: reviewPrompt,
  risk: riskPrompt,
  change: changePrompt,
  postmortem: postmortemPrompt,
  tech: techPrompt,
}

interface ResolvedPrompt {
  system: string
  userPrompt: string
  promptVersion: string
}

/**
 * resolvePrompt：
 * 1. 查 system_prompts 表（DB 优先，is_active = true）
 * 2. 未找到 → 使用代码内置 prompt（fallback）
 * 3. lensType = 'custom' → 查 custom_lenses 表
 */
export async function resolvePrompt(
  lensType: LensType,
  content: string,
  customLensId?: string
): Promise<ResolvedPrompt> {
  const supabase = await createClient()

  // custom 透镜：直接读 custom_lenses 表
  if (lensType === 'custom' && customLensId) {
    const { data } = await (supabase
      .from('custom_lenses')
      .select('system_prompt, name')
      .eq('id', customLensId)
      .eq('is_active', true)
      .single() as any)

    if (data) {
      return {
        system: data.system_prompt,
        userPrompt: `请分析以下内容：\n\n${content}`,
        promptVersion: 'custom-v1',
      }
    }
  }

  // 非 custom：先查 DB system_prompts
  if (lensType !== 'custom') {
    const { data } = await (supabase
      .from('system_prompts')
      .select('system_prompt, version')
      .eq('lens_type', lensType)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as any)

    if (data) {
      return {
        system: data.system_prompt,
        userPrompt: builtinPrompts[lensType]?.userTemplate.replace('{content}', content) ?? content,
        promptVersion: `db-${data.version}`,
      }
    }

    // DB 无结果 → 使用代码内置 fallback
    const builtin = builtinPrompts[lensType]
    if (builtin) {
      return {
        system: builtin.system,
        userPrompt: builtin.userTemplate.replace('{content}', content),
        promptVersion: 'v1',
      }
    }
  }

  // 最终兜底
  return {
    system: '你是一位专业的文档分析助手，请对以下内容进行分析和总结。',
    userPrompt: content,
    promptVersion: 'v0-fallback',
  }
}
