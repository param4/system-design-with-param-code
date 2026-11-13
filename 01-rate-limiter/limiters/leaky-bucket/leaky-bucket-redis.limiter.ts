import { setTimeout as sleep } from "node:timers/promises";
import type { Redis, Result } from "ioredis";
import type { RateLimiter } from "../../interfaces";
import { defineLuaCommand, toDecision } from "../../redis";
import type { LeakyBucketLuaReply, LeakyBucketOptions, RateLimiterDecision } from "../../types";

// Tells TypeScript about the command defineLuaCommand adds (leaky-bucket.lua)
declare module "ioredis" {
    interface RedisCommander<Context> {
        leakyBucket(key: string, capacity: number, leakEveryMs: number): Result<LeakyBucketLuaReply, Context>;
    }
}

/**
 * Leaky bucket shared by every server. Instead of a queue plus a worker,
 * each request books its turn to leave (one per interval) in one Lua script,
 * then waits here until that turn. Same output as the memory version: smooth, at most `capacity` waiting.
 */
export class LeakyBucketRedisLimiter implements RateLimiter {
    private readonly capacity: number;
    private readonly leakEveryMs: number;
    private readonly redis: Redis;

    constructor(redis: Redis, options: LeakyBucketOptions) {
        this.capacity = options.capacity;
        this.leakEveryMs = 1000 / options.leakPerSecond;
        this.redis = redis;
        defineLuaCommand(redis, "leakyBucket", new URL("./leaky-bucket.lua", import.meta.url));
    }

    async isAllowed(key: string): Promise<RateLimiterDecision> {
        const [allowed, remaining, retryAfterMs, resetAfterMs, waitMs] =
            await this.redis.leakyBucket(`rl:leaky-bucket:${key}`, this.capacity, this.leakEveryMs);

        // Wait in the queue until this request's turn to leave
        if (waitMs > 0) await sleep(waitMs);

        return toDecision([allowed, remaining, retryAfterMs, resetAfterMs], this.capacity);
    }
}
