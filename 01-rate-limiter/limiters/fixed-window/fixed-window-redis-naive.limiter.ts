import type { Redis } from "ioredis";
import type { RateLimiter } from "../../interfaces";
import type { FixedWindowOptions, RateLimiterDecision } from "../../types";

/**
 * BROKEN ON PURPOSE, for the demo. Use FixedWindowRedisLimiter instead.
 *
 * INCR and EXPIRE are two separate commands. If the app crashes between them,
 * the key has no expiry and stays in Redis forever.
 */
export class FixedWindowRedisNaiveLimiter implements RateLimiter {
    private readonly limit: number;
    private readonly windowMs: number;
    private readonly redis: Redis;

    constructor(redis: Redis, options: Omit<FixedWindowOptions, "now">) {
        this.limit = options.limit;
        this.windowMs = options.windowMs;
        this.redis = redis;
    }

    async isAllowed(key: string): Promise<RateLimiterDecision> {
        const currentTime = Date.now();
        const windowStart = currentTime - (currentTime % this.windowMs);
        const redisKey = `rl:fixed-window-naive:${key}:${windowStart}`;

        const count = await this.redis.incr(redisKey);
        // ❌ The gap: a crash right here leaves the key with no TTL
        if (count === 1) await this.redis.pexpire(redisKey, this.windowMs);

        const resetAfterSeconds = Math.ceil((windowStart + this.windowMs - currentTime) / 1000);
        const allowed = count <= this.limit;

        return {
            allowed,
            limit: this.limit,
            requestsRemaining: Math.max(0, this.limit - count),
            resetAfterSeconds,
            retryAfterSeconds: allowed ? 0 : resetAfterSeconds,
        };
    }
}
