import type { RateLimiter } from "../../interfaces";
import { DecisionUtil } from "../decision.util";
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
        const log = this.recentLog(key, currentTime);

        if (log.length >= this.limit) return DecisionUtil.block(this.limit, this.resetAfterSeconds(log, currentTime));

        log.push(currentTime);
        return DecisionUtil.allow(this.limit, this.limit - log.length, this.resetAfterSeconds(log, currentTime));
    }

    /**
     * The key's log with requests older than the window dropped.
     */
    private recentLog(key: string, time: number): number[] {
        const log = this.logs.get(key) ?? [];
        this.logs.set(key, log);
        while (log.length && log[0]! <= time - this.windowMs) log.shift();
        return log;
    }

    /**
     * A slot frees up when the oldest request leaves the window.
     */
    private resetAfterSeconds(log: number[], time: number): number {
        return DecisionUtil.toSeconds(log[0]! + this.windowMs - time);
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
