import { readFileSync } from "node:fs";
import type { Redis } from "ioredis";
import type { LuaReply, RateLimiterDecision } from "../types";

/**
 * Registers a .lua file as a Redis command, e.g. redis.tokenBucket(key, ...args).
 * ioredis sends it with EVALSHA (just the script's hash) and falls back to EVAL
 * the first time, when Redis does not have the script cached yet.
 */
export function defineLuaCommand(redis: Redis, name: string, script: URL): void {
    redis.defineCommand(name, { numberOfKeys: 1, lua: readFileSync(script, "utf8") });
}

const toSeconds = (ms: number) => Math.ceil(ms / 1000);

/**
 * Turns a script's reply into the same decision the memory limiters return.
 */
export function toDecision([allowed, remaining, retryAfterMs, resetAfterMs]: LuaReply, limit: number): RateLimiterDecision {
    return {
        allowed: allowed === 1,
        limit,
        requestsRemaining: remaining,
        resetAfterSeconds: toSeconds(resetAfterMs),
        // A rejected client should never be told to retry in 0 seconds
        retryAfterSeconds: allowed === 1 ? 0 : Math.max(1, toSeconds(retryAfterMs)),
    };
}
