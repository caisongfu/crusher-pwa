import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { requireAdmin, isAdminAuthError } from '../admin/auth'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  getCurrentUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getCurrentUser, createClient } from '@/lib/supabase/server'

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('当用户未登录时应该返回 401 错误', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const result = await requireAdmin()

    expect(isAdminAuthError(result)).toBe(true)
    const json = await (result as NextResponse).json()
    expect(json).toEqual({ error: 'Unauthorized' })
    expect((result as NextResponse).status).toBe(401)
  })

  it('当用户不是管理员时应该返回 403 错误', async () => {
    const mockUser = { id: 'user-123' }
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'user' },
        error: null
      })
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as any)

    const result = await requireAdmin()

    expect(isAdminAuthError(result)).toBe(true)
    const json = await (result as NextResponse).json()
    expect(json).toEqual({ error: 'Forbidden' })
    expect((result as NextResponse).status).toBe(403)
  })

  it('当用户档案不存在时应该返回 403 错误', async () => {
    const mockUser = { id: 'user-123' }
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null
      })
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as any)

    const result = await requireAdmin()

    expect(isAdminAuthError(result)).toBe(true)
    const json = await (result as NextResponse).json()
    expect(json).toEqual({ error: 'Forbidden' })
    expect((result as NextResponse).status).toBe(403)
  })

  it('当用户是管理员时应该返回用户信息和档案', async () => {
    const mockUser = { id: 'admin-123' }
    const mockProfile = { role: 'admin' }

    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null
      })
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as any)

    const result = await requireAdmin()

    expect(isAdminAuthError(result)).toBe(false)
    expect(result).toEqual({ user: mockUser, profile: mockProfile })
  })

  it('应该正确查询用户档案', async () => {
    const mockUser = { id: 'admin-123' }
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'admin' },
        error: null
      })
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as any)

    await requireAdmin()

    expect(createClient).toHaveBeenCalled()
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
    expect(mockSupabaseClient.select).toHaveBeenCalledWith('role')
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'admin-123')
  })
})

describe('isAdminAuthError', () => {
  it('应该正确识别 NextResponse 错误对象', () => {
    const errorResponse = NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )

    expect(isAdminAuthError(errorResponse)).toBe(true)
  })

  it('应该正确识别非错误对象', () => {
    const successResult = {
      user: { id: 'admin-123' },
      profile: { role: 'admin' }
    }

    expect(isAdminAuthError(successResult)).toBe(false)
  })
})
