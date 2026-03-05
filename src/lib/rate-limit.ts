import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// 20 次/分钟/用户，滑动窗口
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  prefix: 'crusher:insights',
})
