export type RateLimiterDecision = {
    allowed: boolean;
    limit: number;
    retryAfterSeconds: number;
    requestsRemaining: number;
    resetAfterSeconds: number;
}