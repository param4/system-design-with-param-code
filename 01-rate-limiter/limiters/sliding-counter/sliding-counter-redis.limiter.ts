import type { Redis, Result } from "ioredis";
import type { RateLimiter } from "../../interfaces";
import { defineLuaCommand, toDecision } from "../../redis";
import type { LuaReply, RateLimiterDecision, SlidingCounterOptions } from "../../types";

// Tells TypeScript about the command defineLuaCommand adds (sliding-counter.lua)
declare module "ioredis" {
    interface RedisCommander<Context> {
        slidingCounter(key: string, limit: number, windowMs: number): Result<LuaReply, Context>;
    }
}

/**
 * Sliding counter in Redis: previous and current window counts per user.
 * Read, estimate and count run in one Lua script, so two servers can't both see 9 and add.
 */
export class SlidingCounterRedisLimiter implements RateLimiter {
    private readonly limit: number;
    private readonly windowMs: number;
    private readonly redis: Redis;

    constructor(redis: Redis, options: Omit<SlidingCounterOptions, "now">) {
        this.limit = options.limit;
        this.windowMs = options.windowMs;
        this.redis = redis;
        defineLuaCommand(redis, "slidingCounter", new URL("./sliding-counter.lua", import.meta.url));
    }

    async isAllowed(key: string): Promise<RateLimiterDecision> {
        const reply = await this.redis.slidingCounter(`rl:sliding-counter:${key}`, this.limit, this.windowMs);
        return toDecision(reply, this.limit);
    }
}
