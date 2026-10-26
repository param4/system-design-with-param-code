import type { RateLimiter } from "../../interfaces";
import type { FixedWindowOptions, RateLimiterDecision } from "../../types";

type WindowCounter = {
    windowStart: number;
    count: number;
};

export class FixedWindowMemoryLimiter implements RateLimiter {
    private readonly limit: number;
    private readonly windowMs: number;
    private readonly now: () => number;
    private readonly counters = new Map<string, WindowCounter>();
    private sweeper: NodeJS.Timeout | undefined;

    constructor(options: FixedWindowOptions) {
        this.limit = options.limit;
        this.windowMs = options.windowMs;
        this.now = options.now ?? Date.now;
    }

    public async init(): Promise<void> {
        if (this.sweeper) return;
        this.sweeper = setInterval(()=> this.sweep(), this.windowMs).unref();
    }

    private windowStartOf(time: number): number {
        return time - (time % this.windowMs);
    }

    async isAllowed(key: string): Promise<RateLimiterDecision> {
        const currentTime = this.now();
        const windowStart = this.windowStartOf(currentTime);
        
        let counter = this.counters.get(key);
        if (!counter || counter.windowStart !== windowStart) {
            counter = {
                windowStart,
                count: 0
            }
            this.counters.set(key, counter);
        }

        const resetAfterSeconds = Math.ceil((counter.windowStart + this.windowMs - currentTime)/1000);

        const hasQuota = counter.count < this.limit;
        if (!hasQuota) return {
            allowed: false,
            limit: this.limit,
            requestsRemaining: 0,
            resetAfterSeconds,
            retryAfterSeconds: resetAfterSeconds
        };

        counter.count += 1;
        return {
            allowed: true,
            limit: this.limit,
            requestsRemaining: this.limit - counter.count,
            resetAfterSeconds,
            retryAfterSeconds: 0,
        };
    }

    private sweep() : void {
        const currentTime = this.now();
        const windowStart = this.windowStartOf(currentTime);
        this.counters.entries().forEach(([key, value])=> {
            if (value.windowStart < windowStart) {
                this.counters.delete(key);
            }
        }) 
    }

    public async close(): Promise<void> {
        clearInterval(this.sweeper);
        this.sweeper = undefined;
    }
}
