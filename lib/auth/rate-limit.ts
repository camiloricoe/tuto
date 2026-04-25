import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

function createLimiter(tokens: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    // No-op limiter for local dev without Upstash
    return {
      limit: async (_key: string) => ({ success: true, limit: tokens, remaining: tokens, reset: 0 }),
    }
  }

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true,
  })
}

export const loginLimiter = createLimiter(5, '10 m')
export const forgotPasswordLimiter = createLimiter(3, '1 h')
export const resetPasswordLimiter = createLimiter(5, '1 h')
export const inviteLimiter = createLimiter(50, '1 h')
