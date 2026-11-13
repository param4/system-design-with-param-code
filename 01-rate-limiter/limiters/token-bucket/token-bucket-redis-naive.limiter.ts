import { setTimeout as sleep } from "node:timers/promises";
import type { Redis } from "ioredis";
import type { RateLimiter } from "../../interfaces";
import type { RateLimiterDecision, TokenBucketRedisNaiveOptions } from "../../types";

/**
 * BROKEN ON PURPOSE, for the demo. Use TokenBucketRedisLimiter instead.
 *
 * Read (HMGET) → compute in Node → write (HSET) is three steps, not one.
 * Two requests can both read "1 token" before either writes "0", and both get through.
 */
export class TokenBucketRedisNaiveLimiter implements RateLimiter {
    private readonly capacity: number;
    private readonly refillPerMs: number;
    private readonly gapMs: number;
    private readonly redis: Redis;

    constructor(redis: Redis, options: TokenBucketRedisNaiveOptions) {
        this.capacity = options.capacity;
        this.refillPerMs = options.refillPerSecond / 1000;
        this.gapMs = options.gapMs ?? 0;
        this.redis = redis;
    }

    async isAllowed(key: string): Promise<RateLimiterDecision> {
        const redisKey = `rl:token-bucket-naive:${key}`;
        const currentTime = Date.now();

        // 1. Read
        const [savedTokens, savedTs] = await this.redis.hmget(redisKey, "tokens", "ts");
        const lastRefill = savedTs ? Number(savedTs) : currentTime;
        let tokens = savedTokens ? Number(savedTokens) : this.capacity;

        // 2. Compute in Node: same lazy refill as the memory version
        tokens = Math.min(this.capacity, tokens + (currentTime - lastRefill) * this.refillPerMs);
        const hasQuota = tokens >= 1;
        if (hasQuota) tokens -= 1;

        // ❌ The race: other requests read the same old tokens while this one is between read and write
        if (this.gapMs > 0) await sleep(this.gapMs);

        // 3. Write back
        await this.redis.hset(redisKey, { tokens, ts: currentTime });
        await this.redis.pexpire(redisKey, Math.ceil((this.capacity / this.refillPerMs) * 2));

        const toSeconds = (tokensMissing: number) => Math.ceil(tokensMissing / this.refillPerMs / 1000);

        return {
            allowed: hasQuota,
            limit: this.capacity,
            requestsRemaining: Math.floor(tokens),
            resetAfterSeconds: toSeconds(this.capacity - tokens),
            retryAfterSeconds: hasQuota ? 0 : toSeconds(1 - tokens),
        };
    }
}
