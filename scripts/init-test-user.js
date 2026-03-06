// 初始化测试用户脚本
// 运行方式: node scripts/init-test-user.js

const { createClient } = require('@supabase/supabase-js');

// 从环境变量读取配置
const supabaseUrl = 'https://jrllzwzlyiybivvegyfc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpybGx6d3pseWl5Yml2dmVneWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY0NDU5MSwiZXhwIjoyMDg4MjIwNTkxfQ.wPruJhNp-0hyZHN0G6dtyusabRlv5_iA96-IZqWCT2w';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const testUsers = [
  {
    email: 'admin@example.com',
    password: 'Admin123456',
    role: 'admin',
    username: 'Admin',
    credits: 10000
  },
  {
    email: 'user@example.com',
    password: 'User123456',
    role: 'user',
    username: 'Test User',
    credits: 100
  }
];

async function initTestUsers() {
  console.log('开始初始化测试用户...\n');

  for (const user of testUsers) {
    try {
      console.log(`创建用户: ${user.email}`);

      // 1. 创建 Auth 用户
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`  ✗ 用户已存在，跳过创建\n`);
          continue;
        }
        throw authError;
      }

      // 2. 创建或更新 Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          username: user.username,
          role: user.role,
          credits: user.credits
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (profileError) {
        throw profileError;
      }

      console.log(`  ✓ 用户创建成功`);
      console.log(`    ID: ${authData.user.id}`);
      console.log(`    角色: ${user.role}`);
      console.log(`    积分: ${user.credits}\n`);

    } catch (error) {
      console.error(`  ✗ 创建失败: ${error.message}\n`);
    }
  }

  console.log('测试用户初始化完成！');
}

initTestUsers();
