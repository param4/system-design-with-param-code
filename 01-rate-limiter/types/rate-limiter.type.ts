export type RateLimiterDecision = {
    allowed: boolean;
    requestsRemaining: number;
    retryAfterSeconds: number;
    resetAfterMs: number;
}