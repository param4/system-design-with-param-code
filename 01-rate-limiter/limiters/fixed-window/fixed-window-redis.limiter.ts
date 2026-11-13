import type { Redis, Result } from "ioredis";
import type { RateLimiter } from "../../interfaces";
import { defineLuaCommand, toDecision } from "../../redis";
import type { FixedWindowOptions, LuaReply, RateLimiterDecision } from "../../types";

// Tells TypeScript about the command defineLuaCommand adds (fixed-window.lua)
declare module "ioredis" {
    interface RedisCommander<Context> {
        fixedWindow(key: string, limit: number, windowMs: number): Result<LuaReply, Context>;
    }
}

/**
 * Fixed window in Redis, shared by every server. Check and count run in one Lua script,
 * so two servers can't both take the last slot. Time comes from Redis, not the app servers.
 */
export class FixedWindowRedisLimiter implements RateLimiter {
    private readonly limit: number;
    private readonly windowMs: number;
    private readonly redis: Redis;

    constructor(redis: Redis, options: Omit<FixedWindowOptions, "now">) {
        this.limit = options.limit;
        this.windowMs = options.windowMs;
        this.redis = redis;
        defineLuaCommand(redis, "fixedWindow", new URL("./fixed-window.lua", import.meta.url));
    }

    async isAllowed(key: string): Promise<RateLimiterDecision> {
        const reply = await this.redis.fixedWindow(`rl:fixed-window:${key}`, this.limit, this.windowMs);
        return toDecision(reply, this.limit);
    }
}
