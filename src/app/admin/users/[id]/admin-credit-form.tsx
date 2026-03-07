// src/app/admin/users/[id]/admin-credit-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface AdminCreditFormProps {
  userId: string
  currentBalance: number
}

export function AdminCreditForm({ userId, currentBalance }: AdminCreditFormProps) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (type: 'grant' | 'deduct') => {
    const numAmount = parseInt(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('请输入有效的正整数金额')
      return
    }
    if (!description.trim()) {
      toast.error('请填写操作备注')
      return
    }

    if (type === 'deduct' && numAmount > currentBalance) {
      toast.error(`积分不足，当前余额 ${currentBalance}，最多可扣 ${currentBalance}`)
      return
    }

    const finalAmount = type === 'deduct' ? -numAmount : numAmount

    setLoading(true)
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: finalAmount,
          type: type === 'grant' ? 'manual_grant' : 'admin_deduct',
          description: description.trim(),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? '操作失败')
        return
      }

      toast.success(`操作成功！新余额：${data.newBalance} 积分`)
      setAmount('')
      setDescription('')
      router.refresh()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>手动调整积分</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {[100, 500, 1200].map((preset) => (
            <Button
              key={preset}
              variant="outline"
              size="sm"
              onClick={() => setAmount(String(preset))}
            >
              +{preset}
            </Button>
          ))}
          {[50, 100].map((preset) => (
            <Button
              key={`-${preset}`}
              variant="outline"
              size="sm"
              onClick={() => setAmount(String(preset))}
            >
              -{preset}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">调整数量（正整数）</Label>
          <Input
            id="amount"
            type="number"
            min="1"
            placeholder="输入积分数量"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">操作备注（必填，最多 200 字）</Label>
          <Input
            id="description"
            maxLength={200}
            placeholder="例：PayPal 转账 ¥45，订单 ORD-20260305-001"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => handleSubmit('grant')}
            disabled={loading}
            className="flex-1"
          >
            充值积分
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleSubmit('deduct')}
            disabled={loading}
            className="flex-1"
          >
            扣减积分
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          当前余额：{currentBalance} 积分
        </p>
      </CardContent>
    </Card>
  )
}
