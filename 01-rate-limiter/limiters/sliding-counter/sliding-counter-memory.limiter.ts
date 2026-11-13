import type { RateLimiter } from "../../interfaces";
import type { RateLimiterDecision, SlidingCounterOptions } from "../../types";

type WindowCounters = {
    windowStart: number;
    previous: number;
    current: number;
};

export class SlidingCounterMemoryLimiter implements RateLimiter {
    private readonly limit: number;
    private readonly windowMs: number;
    private readonly now: () => number;
    private readonly counters = new Map<string, WindowCounters>();
    private sweeper: NodeJS.Timeout | undefined;

    constructor(options: SlidingCounterOptions) {
        this.limit = options.limit;
        this.windowMs = options.windowMs;
        this.now = options.now ?? Date.now;
    }

    public async init(): Promise<void> {
        if (this.sweeper) return;
        this.sweeper = setInterval(() => this.sweep(), this.windowMs).unref();
    }

    private windowStartOf(time: number): number {
        return time - (time % this.windowMs);
    }

    async isAllowed(key: string): Promise<RateLimiterDecision> {
        const currentTime = this.now();
        const windowStart = this.windowStartOf(currentTime);

        let counter = this.counters.get(key);
        if (!counter) {
            counter = { windowStart, previous: 0, current: 0 };
            this.counters.set(key, counter);
        }

        // New window: the current count becomes the previous one (or 0 if a window was skipped)
        if (counter.windowStart !== windowStart) {
            counter.previous = counter.windowStart === windowStart - this.windowMs ? counter.current : 0;
            counter.current = 0;
            counter.windowStart = windowStart;
        }

        // Weight the previous window by how much of it is still inside the sliding window
        const elapsed = (currentTime - windowStart) / this.windowMs;
        const estimate = counter.previous * (1 - elapsed) + counter.current;

        const resetAfterSeconds = Math.ceil((windowStart + this.windowMs - currentTime) / 1000);

        const hasQuota = estimate + 1 <= this.limit;
        if (!hasQuota) return {
            allowed: false,
            limit: this.limit,
            requestsRemaining: 0,
            resetAfterSeconds,
            retryAfterSeconds: this.retryAfterSeconds(counter, elapsed, resetAfterSeconds),
        };

        counter.current += 1;
        return {
            allowed: true,
            limit: this.limit,
            requestsRemaining: Math.floor(this.limit - (estimate + 1)),
            resetAfterSeconds,
            retryAfterSeconds: 0,
        };
    }

    /**
     * When enough of the previous window slides out to fit one more request.
     */
    private retryAfterSeconds(counter: WindowCounters, elapsed: number, resetAfterSeconds: number): number {
        const room = this.limit - 1 - counter.current;
        if (room < 0 || counter.previous === 0) return resetAfterSeconds;

        const neededElapsed = 1 - room / counter.previous;
        return Math.max(1, Math.ceil(((neededElapsed - elapsed) * this.windowMs) / 1000));
    }

    private sweep(): void {
        // Older than the previous window: no longer counts at all
        const cutoff = this.windowStartOf(this.now()) - this.windowMs;
        for (const [key, counter] of this.counters) {
            if (counter.windowStart < cutoff) this.counters.delete(key);
        }
    }

    public async close(): Promise<void> {
        clearInterval(this.sweeper);
        this.sweeper = undefined;
    }
}
