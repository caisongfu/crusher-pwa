# MFA 配置指南

## 概述

多因素认证 (MFA) 为管理员账户提供额外的安全层。本文档说明如何在 Supabase 中启用 MFA 并为管理员账户配置。

## MFA 类型

Supabase 支持以下 MFA 类型：

1. **TOTP (Time-based One-Time Password)** - 基于 TOTP 应用（如 Google Authenticator）
2. **SMS** - 短信验证码（需要配置短信服务）
3. **Email** - 邮件验证码

**推荐使用 TOTP**，因为：
- 无需额外费用
- 离线可用
- 更安全（基于时间）

## 启用 Supabase MFA

### Step 1: 登录 Supabase Dashboard

1. 访问 https://supabase.com/dashboard
2. 选择你的项目
3. 进入 **Authentication** → **Providers**

### Step 2: 配置 Email Provider

确保 Email Provider 已启用：

1. 在 **Authentication** → **Providers** → **Email**
2. 确认 **Email Provider** 已启用
3. 检查 **Enable Email confirmations** 设置

### Step 3: 启用 MFA

Supabase 默认支持 TOTP MFA，无需额外配置。如需启用 SMS 或 Email MFA，需要：

#### SMS MFA 配置

1. **Authentication** → **Providers** → **SMS**
2. 启用 **Enable Phone Provider**
3. 配置短信服务商：
   - Twilio
   - MessageBird
   - 其他支持的提供商
4. 填写 API Key 和配置

#### Email MFA 配置

Email MFA 使用默认的邮件服务商，无需额外配置。

### Step 4: 配置 MFA 策略（可选）

在 Supabase Dashboard 中配置 MFA 策略：

1. **Authentication** → **Providers** → **Email**
2. 在 **Advanced** 部分，配置：
   - **MFA Factor Enforcement**: 要求用户启用 MFA
   - **MFA Verification Expiration**: 验证码过期时间

## 为管理员账户启用 MFA

### 方法 1: 通过 Supabase Dashboard

#### Step 1: 查找管理员账户

1. **Authentication** → **Users**
2. 找到管理员账户（role = 'admin' 的用户）

#### Step 2: 启用 MFA

1. 点击管理员账户
2. 在用户详情页面，找到 **Factors** 部分
3. 点击 **Add Factor**
4. 选择 **TOTP**
5. Supabase 会生成 QR 码

#### Step 3: 配置 TOTP 应用

1. 使用 TOTP 应用扫描 QR 码：
   - Google Authenticator
   - Authy
   - Microsoft Authenticator
   - 1Password
   - Bitwarden

2. 输入 TOTP 应用生成的 6 位验证码

3. 点击 **Verify** 确认

4. 备份恢复码（重要！）

#### Step 4: 测试 MFA

1. 退出管理员账户
2. 重新登录
3. 登录时输入 TOTP 应用中的验证码

### 方法 2: 使用 Supabase Client（程序化）

#### Step 1: 安装依赖

```bash
npm install @supabase/supabase-js
```

#### Step 2: 创建 MFA 启用脚本

```typescript
// scripts/enable-mfa.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function enableMFAForAdmin() {
  try {
    // 1. 查找管理员账户
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('role', 'admin')

    if (profileError) throw profileError

    console.log('找到管理员账户:', profiles)

    // 2. 为每个管理员启用 MFA
    for (const profile of profiles) {
      console.log(`\n为 ${profile.email} 启用 MFA...`)

      // 注意：MFA 必须由用户自己通过 Supabase Client 启用
      // 这里只是列出需要启用 MFA 的管理员账户
      console.log('请使用 Supabase Dashboard 为此账户启用 MFA')
      console.log(`用户 ID: ${profile.id}`)
      console.log(`邮箱: ${profile.email}`)
    }

    console.log('\n启用 MFA 步骤:')
    console.log('1. 访问 https://supabase.com/dashboard')
    console.log('2. 进入 Authentication → Users')
    console.log('3. 点击管理员账户')
    console.log('4. 在 Factors 部分，添加 TOTP factor')
    console.log('5. 使用 TOTP 应用扫描 QR 码')
    console.log('6. 输入验证码完成验证')
  } catch (error) {
    console.error('错误:', error)
  }
}

enableMFAForAdmin()
```

#### Step 3: 运行脚本

```bash
# 设置环境变量
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 运行脚本
npm run enable-mfa
```

## 前端集成 MFA（可选）

### Step 1: 创建 MFA 组件

```typescript
// src/components/mfa-setup.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function MFASetup() {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const enrollMFA = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      })

      if (error) throw error

      // 显示 QR 码（data.totp.qr_code 是 base64 编码的图片）
      setQrCode(data.totp.qr_code)
    } catch (err) {
      setError(err instanceof Error ? err.message : '启用 MFA 失败')
    } finally {
      setLoading(false)
    }
  }

  const verifyMFA = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: 'your-factor-id', // 从 enroll 响应中获取
        challengeId: 'your-challenge-id', // 从 enroll 响应中获取
        code: verificationCode,
      })

      if (error) throw error

      console.log('MFA 启用成功:', data)
      alert('MFA 启用成功！')
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">设置多因素认证</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {!qrCode ? (
        <button
          onClick={enrollMFA}
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? '生成中...' : '启用 MFA'}
        </button>
      ) : (
        <div>
          <div className="mb-4">
            <img src={`data:image/png;base64,${qrCode}`} alt="QR Code" className="mx-auto" />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              输入验证码
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="输入 TOTP 应用中的 6 位验证码"
              className="w-full p-2 border rounded"
              maxLength={6}
            />
          </div>

          <button
            onClick={verifyMFA}
            disabled={loading || verificationCode.length !== 6}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? '验证中...' : '验证'}
          </button>
        </div>
      )}
    </div>
  )
}
```

### Step 2: 登录时验证 MFA

```typescript
// src/components/mfa-login.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function MFALogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [factors, setFactors] = useState<any[]>([])

  const supabase = createClient()

  const signIn = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // 检查是否启用了 MFA
      if (data.user && data.user.factors && data.user.factors.length > 0) {
        setFactors(data.user.factors)
        setStep('mfa')
      } else {
        alert('登录成功！')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const verifyMFA = async () => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factors[0].id,
        challengeId: factors[0].challenge_id,
        code: mfaCode,
      })

      if (error) throw error

      alert('登录成功！')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA 验证失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">
        {step === 'credentials' ? '登录' : '输入验证码'}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {step === 'credentials' ? (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <button
            onClick={signIn}
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              输入 TOTP 验证码
            </label>
            <input
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="6 位验证码"
              className="w-full p-2 border rounded"
              maxLength={6}
            />
          </div>

          <button
            onClick={verifyMFA}
            disabled={loading || mfaCode.length !== 6}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? '验证中...' : '验证'}
          </button>

          <button
            onClick={() => setStep('credentials')}
            className="w-full mt-2 py-2 px-4 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            返回
          </button>
        </div>
      )}
    </div>
  )
}
```

## MFA 验证检查清单

### 管理员账户 MFA 检查

- [ ] 管理员账户已启用 MFA
- [ ] MFA 类型已配置（推荐 TOTP）
- [ ] QR 码已扫描到 TOTP 应用
- [ ] 验证码验证成功
- [ ] 恢复码已备份
- [ ] 重新登录时需要 MFA 验证

### MFA 配置检查

- [ ] Supabase Email Provider 已启用
- [ ] MFA 已在 Supabase Dashboard 中配置
- [ ] MFA 策略已设置（可选）
- [ ] 管理员账户已启用 MFA
- [ ] 登录流程支持 MFA 验证

### 安全检查

- [ ] MFA 验证码有效期合理
- [ ] 恢复码已安全存储
- [ ] 备用管理员账户已启用 MFA
- [ ] MFA 日志已记录

## 常见问题

### 问题 1: 无法扫描 QR 码

**解决方案**：
- 检查 TOTP 应用是否正常工作
- 尝试使用其他 TOTP 应用
- 手动输入密钥（如果提供）

### 问题 2: 验证码无效

**解决方案**：
- 确保设备时间同步
- 检查验证码是否过期（通常 30 秒）
- 重新生成 QR 码

### 问题 3: 忘记恢复码

**解决方案**：
- 联系其他管理员重置 MFA
- 使用 Supabase Dashboard 禁用该用户的 MFA
- 重新启用 MFA 并备份新的恢复码

### 问题 4: 前端登录不支持 MFA

**解决方案**：
- 实现上述 MFA 组件
- 在登录流程中添加 MFA 验证步骤
- 参考 Supabase Auth MFA 文档

## 最佳实践

1. **强制管理员启用 MFA**
   - 在用户注册或更新角色时，强制管理员启用 MFA

2. **备份恢复码**
   - 将恢复码存储在安全的地方（密码管理器）
   - 不要将恢复码发送到邮箱

3. **设置备用管理员**
   - 为多个管理员账户启用 MFA
   - 防止单点故障

4. **定期审计 MFA**
   - 检查所有管理员账户是否启用 MFA
   - 验证 MFA 配置是否正确

5. **记录 MFA 事件**
   - 记录 MFA 启用、禁用、验证事件
   - 监控异常活动

## 参考资料

- [Supabase Auth MFA 文档](https://supabase.com/docs/guides/auth/server-side/mfa)
- [TOTP 应用列表](https://en.wikipedia.org/wiki/Time-based_one-time_password)
- [OWASP MFA 最佳实践](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

## 总结

Crusher 项目的 MFA 配置：

- ✅ Supabase 支持 TOTP MFA
- ✅ 推荐使用 TOTP 应用（Google Authenticator）
- ✅ 可选：前端集成 MFA 验证流程
- ✅ 建议为所有管理员账户启用 MFA
- ✅ 备份恢复码以防止丢失

启用 MFA 后，管理员账户安全性将显著提升。
