import { createOpenAI } from '@ai-sdk/openai'

export const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: 'https://api.deepseek.com/v1',
})

export const deepseekModel = deepseek('deepseek-reasoner')
