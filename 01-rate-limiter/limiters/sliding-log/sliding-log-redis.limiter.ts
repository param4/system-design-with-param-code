import { randomUUID } from "node:crypto";
import type { Redis, Result } from "ioredis";
import type { RateLimiter } from "../../interfaces";
import { defineLuaCommand, toDecision } from "../../redis";
import type { LuaReply, RateLimiterDecision, SlidingLogOptions } from "../../types";

// Tells TypeScript about the command defineLuaCommand adds (sliding-log.lua)
declare module "ioredis" {
    interface RedisCommander<Context> {
        slidingLog(key: string, limit: number, windowMs: number, requestId: string): Result<LuaReply, Context>;
    }
}

/**
 * Sliding log in Redis: a sorted set of request times per user.
 * Remove old, count and add run in one Lua script, so two servers can't both see "99" and add.
 */
export class SlidingLogRedisLimiter implements RateLimiter {
    private readonly limit: number;
    private readonly windowMs: number;
    private readonly redis: Redis;

    constructor(redis: Redis, options: Omit<SlidingLogOptions, "now">) {
        this.limit = options.limit;
        this.windowMs = options.windowMs;
        this.redis = redis;
        defineLuaCommand(redis, "slidingLog", new URL("./sliding-log.lua", import.meta.url));
    }

    async isAllowed(key: string): Promise<RateLimiterDecision> {
        // Each request needs its own member: two requests in the same millisecond must not collapse into one
        const reply = await this.redis.slidingLog(`rl:sliding-log:${key}`, this.limit, this.windowMs, randomUUID());
        return toDecision(reply, this.limit);
    }
}
