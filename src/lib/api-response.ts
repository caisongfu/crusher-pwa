import { NextResponse } from 'next/server'
import type { ApiResponse, ApiSuccessResponse, ApiErrorResponse, ApiMeta } from '@/types'

/**
 * 创建成功响应
 */
export function apiSuccess<T>(
  data: T,
  status: number = 200,
  meta?: ApiMeta
): NextResponse<ApiSuccessResponse<T>> {
  const body: ApiSuccessResponse<T> = { success: true, data }
  if (meta) body.meta = meta
  return NextResponse.json(body, { status })
}

/**
 * 创建失败响应
 */
export function apiError(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = { success: false, error: message }
  if (code) body.code = code
  if (details) body.details = details
  return NextResponse.json(body, { status })
}

/**
 * 创建未授权响应
 */
export function unauthorized(): NextResponse<ApiErrorResponse> {
  return apiError('Unauthorized', 401, 'UNAUTHORIZED')
}

/**
 * 创建禁止访问响应
 */
export function forbidden(): NextResponse<ApiErrorResponse> {
  return apiError('Forbidden', 403, 'FORBIDDEN')
}

/**
 * 创建未找到响应
 */
export function notFound(resource: string = 'Resource'): NextResponse<ApiErrorResponse> {
  return apiError(`${resource} not found`, 404, 'NOT_FOUND')
}

/**
 * 创建验证错误响应
 */
export function validationError(message: string = 'Validation failed'): NextResponse<ApiErrorResponse> {
  return apiError(message, 422, 'VALIDATION_ERROR')
}

/**
 * 创建分页响应
 */
export function apiPaginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): NextResponse<ApiSuccessResponse<T[]>> {
  const totalPages = Math.ceil(total / limit)
  const meta: ApiMeta = {
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages
  }
  return apiSuccess(data, 200, meta)
}
