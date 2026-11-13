import type { Redis } from "ioredis";
import type { RateLimiter } from "../interfaces";
import type { FailMode, LimiterEntry } from "../types";
import { FailSafeLimiter } from "./fail-safe.limiter";
import { FixedWindowMemoryLimiter } from "./fixed-window/fixed-window-memory.limiter";
import { FixedWindowRedisNaiveLimiter } from "./fixed-window/fixed-window-redis-naive.limiter";
import { FixedWindowRedisLimiter } from "./fixed-window/fixed-window-redis.limiter";
import { LeakyBucketMemoryLimiter } from "./leaky-bucket/leaky-bucket-memory.limiter";
import { LeakyBucketRedisLimiter } from "./leaky-bucket/leaky-bucket-redis.limiter";
import { SlidingCounterMemoryLimiter } from "./sliding-counter/sliding-counter-memory.limiter";
import { SlidingCounterRedisLimiter } from "./sliding-counter/sliding-counter-redis.limiter";
import { SlidingLogMemoryLimiter } from "./sliding-log/sliding-log-memory.limiter";
import { SlidingLogRedisLimiter } from "./sliding-log/sliding-log-redis.limiter";
import { TokenBucketMemoryLimiter } from "./token-bucket/token-bucket-memory.limiter";
import { TokenBucketRedisNaiveLimiter } from "./token-bucket/token-bucket-redis-naive.limiter";
import { TokenBucketRedisLimiter } from "./token-bucket/token-bucket-redis.limiter";

/**
 * Every algorithm the app serves. Add one entry here, and its route (/api/<name>)
 * and its tab on the demo page follow automatically.
 */
export function createLimiters(redis: Redis): LimiterEntry[] {
    const fixedWindow = { limit: 5, windowMs: 10_000 };
    const slidingLog = { limit: 5, windowMs: 10_000 };
    const slidingCounter = { limit: 5, windowMs: 10_000 };
    const tokenBucket = { capacity: 5, refillPerSecond: 0.5 };
    const leakyBucket = { capacity: 5, leakPerSecond: 2 };
    // Naive version only: a pause between read and write so the race shows on one laptop
    const tokenBucketNaive = { ...tokenBucket, gapMs: 50 };

    // Redis can go down; RATE_LIMIT_FAIL_MODE=closed rejects requests then, anything else lets them through
    const failMode: FailMode = process.env.RATE_LIMIT_FAIL_MODE === "closed" ? "closed" : "open";
    const failSafe = (limiter: RateLimiter, limit: number) => new FailSafeLimiter(limiter, { mode: failMode, limit });

    return [
        { name: "fixed-window", label: "Fixed window", store: "memory", config: fixedWindow, limiter: new FixedWindowMemoryLimiter(fixedWindow) },
        { name: "sliding-log", label: "Sliding log", store: "memory", config: slidingLog, limiter: new SlidingLogMemoryLimiter(slidingLog) },
        { name: "sliding-counter", label: "Sliding counter", store: "memory", config: slidingCounter, limiter: new SlidingCounterMemoryLimiter(slidingCounter) },
        { name: "token-bucket", label: "Token bucket", store: "memory", config: tokenBucket, limiter: new TokenBucketMemoryLimiter(tokenBucket) },
        { name: "leaky-bucket", label: "Leaky bucket", store: "memory", config: leakyBucket, limiter: new LeakyBucketMemoryLimiter(leakyBucket) },

        { name: "fixed-window-redis-naive", label: "Fixed window", store: "redis-naive", config: fixedWindow, limiter: failSafe(new FixedWindowRedisNaiveLimiter(redis, fixedWindow), fixedWindow.limit) },
        { name: "token-bucket-redis-naive", label: "Token bucket", store: "redis-naive", config: tokenBucketNaive, limiter: failSafe(new TokenBucketRedisNaiveLimiter(redis, tokenBucketNaive), tokenBucket.capacity) },

        { name: "fixed-window-redis-lua", label: "Fixed window", store: "redis-lua", config: fixedWindow, limiter: failSafe(new FixedWindowRedisLimiter(redis, fixedWindow), fixedWindow.limit) },
        { name: "sliding-log-redis-lua", label: "Sliding log", store: "redis-lua", config: slidingLog, limiter: failSafe(new SlidingLogRedisLimiter(redis, slidingLog), slidingLog.limit) },
        { name: "sliding-counter-redis-lua", label: "Sliding counter", store: "redis-lua", config: slidingCounter, limiter: failSafe(new SlidingCounterRedisLimiter(redis, slidingCounter), slidingCounter.limit) },
        { name: "token-bucket-redis-lua", label: "Token bucket", store: "redis-lua", config: tokenBucket, limiter: failSafe(new TokenBucketRedisLimiter(redis, tokenBucket), tokenBucket.capacity) },
        { name: "leaky-bucket-redis-lua", label: "Leaky bucket", store: "redis-lua", config: leakyBucket, limiter: failSafe(new LeakyBucketRedisLimiter(redis, leakyBucket), leakyBucket.capacity) },
    ];
}
