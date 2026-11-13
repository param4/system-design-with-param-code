/**
 * What every rate limiter Lua script returns.
 * Times are in milliseconds: Redis turns Lua numbers into integers, so no fractions.
 */
export type LuaReply = [allowed: number, remaining: number, retryAfterMs: number, resetAfterMs: number];

/**
 * The leaky bucket also says how long the request waits in the queue before it may go.
 */
export type LeakyBucketLuaReply = [...LuaReply, waitMs: number];
