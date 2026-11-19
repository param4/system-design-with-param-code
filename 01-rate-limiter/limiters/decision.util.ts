import type { RateLimiterDecision } from "../types";

/**
 * Builds the decision every limiter returns, so each isAllowed() only holds its algorithm.
 */
export class DecisionUtil {
    static allow(limit: number, requestsRemaining: number, resetAfterSeconds: number): RateLimiterDecision {
        return { allowed: true, limit, requestsRemaining, resetAfterSeconds, retryAfterSeconds: 0 };
    }

    static block(limit: number, resetAfterSeconds: number, retryAfterSeconds = resetAfterSeconds): RateLimiterDecision {
        return { allowed: false, limit, requestsRemaining: 0, resetAfterSeconds, retryAfterSeconds };
    }

    /**
     * Milliseconds to whole seconds, rounded up (headers carry whole seconds).
     */
    static toSeconds(ms: number): number {
        return Math.ceil(ms / 1000);
    }
}
