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

async function checkData() {
  console.log('=== 检查 profiles 表 ===')
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, created_at, role, credits')
    .order('created_at', { ascending: false })
    .limit(10)

  if (profilesError) {
    console.error('查询 profiles 失败:', profilesError)
  } else {
    console.log(`总用户数: ${profiles?.length || 0}`)
    console.log('最近注册的用户:')
    profiles?.forEach(p => {
      console.log(`  - ${p.id.substring(0, 8)}... 注册于 ${p.created_at} (${p.role})`)
    })
  }

  console.log('\n=== 检查今日新增用户 ===')
  const today = new Date().toISOString().split('T')[0]
  const { data: todayUsers, error: todayError } = await supabase
    .from('profiles')
    .select('id, created_at')
    .gte('created_at', today)

  if (todayError) {
    console.error('查询今日用户失败:', todayError)
  } else {
    console.log(`今日新增用户数: ${todayUsers?.length || 0}`)
  }

  console.log('\n=== 检查 daily_stats 表 ===')
  const { data: stats, error: statsError } = await supabase
    .from('daily_stats')
    .select('*')
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('date', { ascending: false })

  if (statsError) {
    console.error('查询 daily_stats 失败:', statsError)
  } else {
    console.log(`最近7天统计记录数: ${stats?.length || 0}`)
    stats?.forEach(s => {
      console.log(`  ${s.date}: 新增用户=${s.new_users}, 订单=${s.orders_count}, 活跃用户=${s.active_users}`)
    })
  }

  console.log('\n=== 手动调用 update_daily_stats ===')
  const { data: rpcData, error: rpcError } = await supabase.rpc('update_daily_stats', { p_date: today })

  if (rpcError) {
    console.error('调用 update_daily_stats 失败:', rpcError)
  } else {
    console.log('update_daily_stats 执行成功')
  }

  console.log('\n=== 再次检查今日统计 ===')
  const { data: todayStats, error: todayStatsError } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('date', today)
    .single()

  if (todayStatsError) {
    console.error('查询今日统计失败:', todayStatsError)
  } else {
    console.log('今日统计数据:', JSON.stringify(todayStats, null, 2))
  }
}

checkData().catch(console.error)
