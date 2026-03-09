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

async function applyMigration() {
  console.log('=== 应用 migration: 修复 update_daily_stats 类型问题 ===')

  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260309_fix_daily_stats_type.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  // 移除注释行
  const cleanSql = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: cleanSql })

  if (error) {
    console.error('应用 migration 失败:', error)
    console.log('\n尝试直接执行函数创建...')

    // 直接读取并执行SQL（通过Supabase管理界面或其他方式）
    console.log('\n请手动在 Supabase SQL Editor 中执行以下SQL:')
    console.log('=' .repeat(80))
    console.log(sql)
    console.log('=' .repeat(80))
  } else {
    console.log('Migration 应用成功!')
  }
}

applyMigration().catch(console.error)
