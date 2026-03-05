// src/app/(main)/profile/profile-tabs.tsx
'use client'

import { useState } from 'react'
import { Profile, CreditTransaction, PACKAGES } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ProfileTabsProps {
  profile: Profile | null
  transactions: CreditTransaction[]
  email: string
}

type Tab = 'account' | 'credits' | 'history'

export function ProfileTabs({ profile, transactions, email }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('account')
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'account', label: '账户信息' },
    { key: 'credits', label: '积分 & 充值' },
    { key: 'history', label: '消费记录' },
  ]

  const handlePackageClick = (pkgName: string) => {
    setSelectedPackage(pkgName)
    setShowModal(true)
  }

  return (
    <div>
      {/* Tab 导航 */}
      <div className="flex border-b mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 账户信息 Tab */}
      {activeTab === 'account' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">邮箱</span>
              <span className="font-medium">{email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">用户名</span>
              <span className="font-medium">{profile?.username ?? '未设置'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">角色</span>
              <Badge variant={profile?.role === 'admin' ? 'default' : 'secondary'}>
                {profile?.role === 'admin' ? '管理员' : '普通用户'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">注册时间</span>
              <span className="font-medium">
                {profile?.created_at
                  ? format(new Date(profile.created_at), 'yyyy-MM-dd', { locale: zhCN })
                  : '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 积分 & 充值 Tab */}
      {activeTab === 'credits' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-1">当前余额</p>
                <p className="text-4xl font-bold">{profile?.credits ?? 0}</p>
                <p className="text-muted-foreground text-sm mt-1">积分</p>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">选择充值套餐</h3>
            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(PACKAGES) as [string, { credits: number; amount_fen: number }][]).map(
                ([name, pkg]) => (
                  <Card
                    key={name}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handlePackageClick(name)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-center text-base">{name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-center">
                      <p className="text-2xl font-bold">{pkg.credits}</p>
                      <p className="text-xs text-muted-foreground mb-2">积分</p>
                      <p className="text-lg font-semibold text-primary">
                        ¥{(pkg.amount_fen / 100).toFixed(0)}
                      </p>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* 消费记录 Tab */}
      {activeTab === 'history' && (
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无消费记录</div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{tx.description ?? tx.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(tx.created_at), 'MM-dd HH:mm', { locale: zhCN })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} 积分
                  </p>
                  <p className="text-xs text-muted-foreground">余额 {tx.balance_after}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 充值 Modal（暂不可用）*/}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>支付功能开发中</DialogTitle>
            <DialogDescription>
              自动支付功能正在开发中，目前请通过以下方式手动充值：
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2">
              <span>📧</span>
              <div>
                <p className="text-sm font-medium">PayPal</p>
                <p className="text-sm text-muted-foreground">PayPal.Me/SoulfulCai</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span>💰</span>
              <div>
                <p className="text-sm font-medium">金额</p>
                <p className="text-sm text-muted-foreground">
                  选择套餐对应金额（
                  {selectedPackage && PACKAGES[selectedPackage as keyof typeof PACKAGES]
                    ? `¥${PACKAGES[selectedPackage as keyof typeof PACKAGES].amount_fen / 100}`
                    : '见套餐'}
                  ）
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span>📝</span>
              <div>
                <p className="text-sm font-medium">备注</p>
                <p className="text-sm text-muted-foreground">您的注册邮箱</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              完成支付后，请联系管理员充值积分（通常 24 小时内处理）。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
