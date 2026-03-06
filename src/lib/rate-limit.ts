import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// 创建 Redis 客户端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

// 动态限流：根据用户等级调整限流额度
export async function checkRateLimit(userId: string, userCredits: number) {
  // 根据用户等级确定限流额度
  const limit = userCredits > 500 ? 50 : 20 // VIP 用户：50次/分钟，普通用户：20次/分钟

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, '1 m'),
    analytics: true,
    prefix: `crusher:${userId}`,
  })

  const { success, remaining, reset } = await ratelimit.limit(userId)

  if (!success) {
    const resetTime = new Date(reset)
    return {
      allowed: false,
      remaining,
      resetTime,
      message: `请求过于频繁，请在 ${resetTime.toLocaleTimeString('zh-CN')} 后重试`,
    }
  }

  return {
    allowed: true,
    remaining,
    limit,
  }
}

// 通用限流检查（不区分用户等级）
export async function checkGeneralRateLimit(
  identifier: string,
  limit: number = 10,
  window: string = '1 m'
) {
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window as any),
    analytics: true,
    prefix: `crusher:general:${identifier}`,
  })

  const { success, remaining, reset } = await ratelimit.limit(identifier)

  if (!success) {
    const resetTime = new Date(reset)
    return {
      allowed: false,
      remaining,
      resetTime,
      message: `请求过于频繁，请在 ${resetTime.toLocaleTimeString('zh-CN')} 后重试`,
    }
  }

  return {
    allowed: true,
    remaining,
    limit,
  }
}

// 保留旧的限流接口作为兼容
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  prefix: 'crusher:insights',
})
