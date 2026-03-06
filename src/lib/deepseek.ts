import OpenAI from 'openai'

export const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: 'https://api.deepseek.com',
})

export const DEEPSEEK_MODEL = 'deepseek-reasoner'
