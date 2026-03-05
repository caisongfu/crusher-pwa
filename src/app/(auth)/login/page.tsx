'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleLogin(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const message =
          error.message === 'Invalid login credentials'
            ? '邮箱或密码错误'
            : error.message === 'Email not confirmed'
              ? '请先验证邮箱后再登录，请查收注册时发送的验证邮件'
              : '登录失败，请重试'
        toast.error(message)
        setLoading(false)
        return
      }

      // 成功登录后，等待一下确保 cookies 完全设置
      toast.success('登录成功')
      await new Promise(resolve => setTimeout(resolve, 100))
      router.push('/')
      router.refresh()
    } catch (error) {
      toast.error('登录失败，请重试')
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>登录</CardTitle>
        <CardDescription>使用邮箱和密码登录你的账号</CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </Button>
          <p className="text-sm text-zinc-500">
            还没有账号？{' '}
            <Link href="/register" className="text-zinc-900 font-medium hover:underline">
              立即注册
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
