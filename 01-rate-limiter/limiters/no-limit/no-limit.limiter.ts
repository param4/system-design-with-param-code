import type { RateLimiter } from "../../interfaces";
import type { RateLimiterDecision } from "../../types";

/**
 * The baseline: lets every request through, so the demo can show what "no rate limit" looks like.
 */
export class NoLimitLimiter implements RateLimiter {
    async isAllowed(_key: string): Promise<RateLimiterDecision> {
        return { allowed: true, limit: 0, requestsRemaining: 0, resetAfterSeconds: 0, retryAfterSeconds: 0 };
    }
}
