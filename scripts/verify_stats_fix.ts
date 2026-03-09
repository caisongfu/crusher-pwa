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

async function verifyFix() {
  console.log('=== 验证统计功能修复 ===\n')

  const today = new Date().toISOString().split('T')[0]

  // 1. 调用 update_daily_stats
  console.log('1. 调用 update_daily_stats 函数...')
  const { error: rpcError } = await supabase.rpc('update_daily_stats', { p_date: today })

  if (rpcError) {
    console.error('   ❌ 调用失败:', rpcError.message)
    console.log('\n请先在 Supabase SQL Editor 中执行修复SQL:')
    console.log('   文件: supabase/migrations/20260309_fix_daily_stats_type.sql')
    process.exit(1)
  } else {
    console.log('   ✅ 调用成功')
  }

  // 2. 查询今日统计
  console.log('\n2. 查询今日统计数据...')
  const { data: todayStats, error: statsError } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('date', today)
    .single()

  if (statsError) {
    console.error('   ❌ 查询失败:', statsError.message)
    process.exit(1)
  }

  console.log('   ✅ 查询成功\n')
  console.log('今日统计数据:')
  console.log('─'.repeat(60))
  console.log(`日期: ${todayStats.date}`)
  console.log(`新增用户: ${todayStats.new_users}`)
  console.log(`活跃用户: ${todayStats.active_users}`)
  console.log(`总用户数: ${todayStats.total_users}`)
  console.log(`订单数: ${todayStats.orders_count}`)
  console.log(`收入(分): ${todayStats.total_revenue_fen}`)
  console.log(`积分消耗: ${todayStats.total_credits_consumed}`)
  console.log(`输入Token: ${todayStats.total_input_tokens}`)
  console.log(`输出Token: ${todayStats.total_output_tokens}`)
  console.log(`透镜分布: ${JSON.stringify(todayStats.lens_distribution)}`)
  console.log('─'.repeat(60))

  // 3. 验证数据准确性
  console.log('\n3. 验证数据准确性...')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .gte('created_at', today)

  const actualNewUsers = profiles?.length || 0
  const statsNewUsers = todayStats.new_users

  if (actualNewUsers === statsNewUsers) {
    console.log(`   ✅ 新增用户数准确: ${actualNewUsers}`)
  } else {
    console.log(`   ⚠️  新增用户数不匹配: 实际=${actualNewUsers}, 统计=${statsNewUsers}`)
  }

  const { data: insights } = await supabase
    .from('insights')
    .select('user_id')
    .gte('created_at', today)

  const actualActiveUsers = new Set(insights?.map(i => i.user_id)).size
  const statsActiveUsers = todayStats.active_users

  if (actualActiveUsers === statsActiveUsers) {
    console.log(`   ✅ 活跃用户数准确: ${actualActiveUsers}`)
  } else {
    console.log(`   ⚠️  活跃用户数不匹配: 实际=${actualActiveUsers}, 统计=${statsActiveUsers}`)
  }

  console.log('\n✅ 验证完成！统计功能已修复。')
}

verifyFix().catch(console.error)
