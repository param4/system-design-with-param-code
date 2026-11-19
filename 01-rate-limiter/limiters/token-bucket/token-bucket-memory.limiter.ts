import type { RateLimiter } from "../../interfaces";
import { allow, block, toSeconds } from "../decision";
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
        const bucket = this.bucketFor(key, currentTime);

        // Lazy refill: no timer, just add what the elapsed time earned
        bucket.tokens = Math.min(this.capacity, bucket.tokens + (currentTime - bucket.lastRefill) * this.refillPerMs);
        bucket.lastRefill = currentTime;

        if (bucket.tokens < 1) return block(this.capacity, this.secondsToEarn(this.capacity - bucket.tokens), this.secondsToEarn(1 - bucket.tokens));

        bucket.tokens -= 1;
        return allow(this.capacity, Math.floor(bucket.tokens), this.secondsToEarn(this.capacity - bucket.tokens));
    }

    /**
     * The key's bucket; a new user starts with a full one.
     */
    private bucketFor(key: string, time: number): Bucket {
        const bucket = this.buckets.get(key) ?? { tokens: this.capacity, lastRefill: time };
        this.buckets.set(key, bucket);
        return bucket;
    }

    /**
     * Seconds until the refill adds this many tokens.
     */
    private secondsToEarn(tokens: number): number {
        return toSeconds(tokens / this.refillPerMs);
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
