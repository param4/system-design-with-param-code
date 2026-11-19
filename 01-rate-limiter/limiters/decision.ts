import type { RateLimiterDecision } from "../types";

/**
 * Builders for the decision every limiter returns, so each isAllowed() only holds its algorithm.
 */
export function allow(limit: number, requestsRemaining: number, resetAfterSeconds: number): RateLimiterDecision {
    return { allowed: true, limit, requestsRemaining, resetAfterSeconds, retryAfterSeconds: 0 };
}

export function block(limit: number, resetAfterSeconds: number, retryAfterSeconds = resetAfterSeconds): RateLimiterDecision {
    return { allowed: false, limit, requestsRemaining: 0, resetAfterSeconds, retryAfterSeconds };
}

/**
 * Milliseconds to whole seconds, rounded up (headers carry whole seconds).
 */
export function toSeconds(ms: number): number {
    return Math.ceil(ms / 1000);
}
