import type { RateLimiterDecision } from "../types";

export interface RateLimiter {
    isAllowed(key: string): Promise<RateLimiterDecision>;
}