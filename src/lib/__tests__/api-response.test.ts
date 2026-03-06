import { describe, it, expect } from 'vitest'
import {
  apiSuccess,
  apiError,
  unauthorized,
  forbidden,
  notFound,
  validationError,
  apiPaginated
} from '../api-response'

describe('API Response Helpers', () => {
  describe('apiSuccess', () => {
    it('应该创建成功响应', async () => {
      const response = apiSuccess({ id: '1' })
      const json = await response.json()

      expect(json).toEqual({ success: true, data: { id: '1' } })
      expect(response.status).toBe(200)
    })

    it('应该支持自定义状态码', async () => {
      const response = apiSuccess({ id: '2' }, 201)
      const json = await response.json()

      expect(json).toEqual({ success: true, data: { id: '2' } })
      expect(response.status).toBe(201)
    })

    it('应该支持添加元数据', async () => {
      const response = apiSuccess(
        [{ id: '1' }],
        200,
        { total: 1, page: 1, limit: 10, totalPages: 1, hasMore: false }
      )
      const json = await response.json()

      expect(json).toEqual({
        success: true,
        data: [{ id: '1' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasMore: false }
      })
    })
  })

  describe('apiError', () => {
    it('应该创建错误响应', async () => {
      const response = apiError('Something went wrong')
      const json = await response.json()

      expect(json).toEqual({ success: false, error: 'Something went wrong' })
      expect(response.status).toBe(500)
    })

    it('应该支持自定义状态码', async () => {
      const response = apiError('Not found', 404)
      const json = await response.json()

      expect(json).toEqual({ success: false, error: 'Not found' })
      expect(response.status).toBe(404)
    })

    it('应该支持错误码和详细信息', async () => {
      const response = apiError('Validation failed', 422, 'VALIDATION_ERROR', { field: 'email' })
      const json = await response.json()

      expect(json).toEqual({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { field: 'email' }
      })
    })
  })

  describe('unauthorized', () => {
    it('应该创建 401 响应', async () => {
      const response = unauthorized()
      const json = await response.json()

      expect(json).toEqual({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' })
      expect(response.status).toBe(401)
    })
  })

  describe('forbidden', () => {
    it('应该创建 403 响应', async () => {
      const response = forbidden()
      const json = await response.json()

      expect(json).toEqual({ success: false, error: 'Forbidden', code: 'FORBIDDEN' })
      expect(response.status).toBe(403)
    })
  })

  describe('notFound', () => {
    it('应该创建 404 响应', async () => {
      const response = notFound()
      const json = await response.json()

      expect(json).toEqual({
        success: false,
        error: 'Resource not found',
        code: 'NOT_FOUND'
      })
      expect(response.status).toBe(404)
    })

    it('应该支持自定义资源名称', async () => {
      const response = notFound('User')
      const json = await response.json()

      expect(json).toEqual({
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND'
      })
    })
  })

  describe('validationError', () => {
    it('应该创建 422 响应', async () => {
      const response = validationError()
      const json = await response.json()

      expect(json).toEqual({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR'
      })
      expect(response.status).toBe(422)
    })

    it('应该支持自定义错误消息', async () => {
      const response = validationError('Invalid email format')
      const json = await response.json()

      expect(json).toEqual({
        success: false,
        error: 'Invalid email format',
        code: 'VALIDATION_ERROR'
      })
    })
  })

  describe('apiPaginated', () => {
    it('应该创建分页响应', async () => {
      const response = apiPaginated([{ id: '1' }], 100, 1, 20)
      const json = await response.json()

      expect(json).toEqual({
        success: true,
        data: [{ id: '1' }],
        meta: {
          total: 100,
          page: 1,
          limit: 20,
          totalPages: 5,
          hasMore: true
        }
      })
    })

    it('应该正确计算 totalPages', async () => {
      const response = apiPaginated([{ id: '1' }], 50, 1, 20)
      const json = await response.json()

      expect(json.meta?.totalPages).toBe(3)
    })

    it('应该正确判断 hasMore', async () => {
      const response1 = apiPaginated([{ id: '1' }], 100, 5, 20)
      const json1 = await response1.json()
      expect(json1.meta?.hasMore).toBe(false)

      const response2 = apiPaginated([{ id: '1' }], 100, 3, 20)
      const json2 = await response2.json()
      expect(json2.meta?.hasMore).toBe(true)
    })

    it('应该处理正好整除的情况', async () => {
      const response = apiPaginated([{ id: '1' }], 100, 5, 20)
      const json = await response.json()

      expect(json.meta?.totalPages).toBe(5)
      expect(json.meta?.hasMore).toBe(false)
    })
  })
})
