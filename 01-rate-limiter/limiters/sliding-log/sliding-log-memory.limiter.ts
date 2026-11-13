import type { RateLimiter } from "../../interfaces";
import type { RateLimiterDecision, SlidingLogOptions } from "../../types";

export class SlidingLogMemoryLimiter implements RateLimiter {
    private readonly limit: number;
    private readonly windowMs: number;
    private readonly now: () => number;
    // One timestamp per allowed request, oldest first
    private readonly logs = new Map<string, number[]>();
    private sweeper: NodeJS.Timeout | undefined;

    constructor(options: SlidingLogOptions) {
        this.limit = options.limit;
        this.windowMs = options.windowMs;
        this.now = options.now ?? Date.now;
    }

    public async init(): Promise<void> {
        if (this.sweeper) return;
        this.sweeper = setInterval(() => this.sweep(), this.windowMs).unref();
    }

    async isAllowed(key: string): Promise<RateLimiterDecision> {
        const currentTime = this.now();
        const log = this.logs.get(key) ?? [];
        this.logs.set(key, log);

        // Drop requests that left the window
        while (log.length && log[0]! <= currentTime - this.windowMs) log.shift();

        const hasQuota = log.length < this.limit;
        if (hasQuota) log.push(currentTime);

        // The window frees a slot when its oldest request drops out
        const resetAfterSeconds = Math.ceil((log[0]! + this.windowMs - currentTime) / 1000);

        return {
            allowed: hasQuota,
            limit: this.limit,
            requestsRemaining: this.limit - log.length,
            resetAfterSeconds,
            retryAfterSeconds: hasQuota ? 0 : resetAfterSeconds,
        };
    }

    private sweep(): void {
        const cutoff = this.now() - this.windowMs;
        for (const [key, log] of this.logs) {
            if (!log.length || log.at(-1)! <= cutoff) this.logs.delete(key);
        }
    }

    public async close(): Promise<void> {
        clearInterval(this.sweeper);
        this.sweeper = undefined;
    }
}
