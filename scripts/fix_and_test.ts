import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// 读取 .env.local 文件
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim()
    envVars[key] = value
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('缺少必要的环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixAndTest() {
  console.log('=== 测试修复后的函数 ===')
  console.log('\n请先在 Supabase Dashboard > SQL Editor 中执行以下SQL:\n')
  console.log('=' .repeat(80))

  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260309_fix_daily_stats_type.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')
  console.log(sql)
  console.log('=' .repeat(80))

  console.log('\n执行完成后，按回车继续测试...')

  // 等待用户确认
  await new Promise(resolve => {
    process.stdin.once('data', resolve)
  })

  console.log('\n=== 测试调用 update_daily_stats ===')
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase.rpc('update_daily_stats', { p_date: today })

  if (error) {
    console.error('调用失败:', error)
  } else {
    console.log('✅ 调用成功!')
  }

  console.log('\n=== 查询今日统计数据 ===')
  const { data: stats, error: statsError } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('date', today)
    .single()

  if (statsError) {
    console.error('查询失败:', statsError)
  } else {
    console.log('今日统计数据:')
    console.log(JSON.stringify(stats, null, 2))
  }

  process.exit(0)
}

fixAndTest().catch(console.error)
