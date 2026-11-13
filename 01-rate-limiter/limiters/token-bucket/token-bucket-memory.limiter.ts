import type { RateLimiter } from "../../interfaces";
import type { RateLimiterDecision, TokenBucketOptions } from "../../types";

type Bucket = {
    tokens: number;
    lastRefill: number;
};

export class TokenBucketMemoryLimiter implements RateLimiter {
    private readonly capacity: number;
    private readonly refillPerMs: number;
    private readonly now: () => number;
    private readonly buckets = new Map<string, Bucket>();
    private sweeper: NodeJS.Timeout | undefined;

    constructor(options: TokenBucketOptions) {
        this.capacity = options.capacity;
        this.refillPerMs = options.refillPerSecond / 1000;
        this.now = options.now ?? Date.now;
    }

    /**
     * Time for an empty bucket to fill up again.
     */
    private get fullAfterMs(): number {
        return this.capacity / this.refillPerMs;
    }

    public async init(): Promise<void> {
        if (this.sweeper) return;
        this.sweeper = setInterval(() => this.sweep(), this.fullAfterMs).unref();
    }

    async isAllowed(key: string): Promise<RateLimiterDecision> {
        const currentTime = this.now();
        const bucket = this.buckets.get(key) ?? { tokens: this.capacity, lastRefill: currentTime };
        this.buckets.set(key, bucket);

        // Lazy refill: no timer, just add what the elapsed time earned
        bucket.tokens = Math.min(this.capacity, bucket.tokens + (currentTime - bucket.lastRefill) * this.refillPerMs);
        bucket.lastRefill = currentTime;

        const hasQuota = bucket.tokens >= 1;
        if (hasQuota) bucket.tokens -= 1;

        const toSeconds = (tokensMissing: number) => Math.ceil(tokensMissing / this.refillPerMs / 1000);

        return {
            allowed: hasQuota,
            limit: this.capacity,
            requestsRemaining: Math.floor(bucket.tokens),
            resetAfterSeconds: toSeconds(this.capacity - bucket.tokens),
            retryAfterSeconds: hasQuota ? 0 : toSeconds(1 - bucket.tokens),
        };
    }

    private sweep(): void {
        // A bucket idle long enough to be full is the same as no bucket
        const cutoff = this.now() - this.fullAfterMs;
        for (const [key, bucket] of this.buckets) {
            if (bucket.lastRefill <= cutoff) this.buckets.delete(key);
        }
    }

    public async close(): Promise<void> {
        clearInterval(this.sweeper);
        this.sweeper = undefined;
    }
}
