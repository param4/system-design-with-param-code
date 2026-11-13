import type { Redis, Result } from "ioredis";
import type { RateLimiter } from "../../interfaces";
import { defineLuaCommand, toDecision } from "../../redis";
import type { LuaReply, RateLimiterDecision, TokenBucketOptions } from "../../types";

// Tells TypeScript about the command defineLuaCommand adds (token-bucket.lua)
declare module "ioredis" {
    interface RedisCommander<Context> {
        tokenBucket(key: string, capacity: number, refillPerSecond: number): Result<LuaReply, Context>;
    }
}

/**
 * The fix for the naive version: read, refill, take and write run in one Lua script.
 * Redis runs a script as one step, so no other request can read the bucket in between.
 */
export class TokenBucketRedisLimiter implements RateLimiter {
    private readonly capacity: number;
    private readonly refillPerSecond: number;
    private readonly redis: Redis;

    constructor(redis: Redis, options: Omit<TokenBucketOptions, "now">) {
        this.capacity = options.capacity;
        this.refillPerSecond = options.refillPerSecond;
        this.redis = redis;
        defineLuaCommand(redis, "tokenBucket", new URL("./token-bucket.lua", import.meta.url));
    }

    async isAllowed(key: string): Promise<RateLimiterDecision> {
        const reply = await this.redis.tokenBucket(`rl:token-bucket:${key}`, this.capacity, this.refillPerSecond);
        return toDecision(reply, this.capacity);
    }
}
