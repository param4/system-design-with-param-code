import type { RateLimiter } from "../interfaces";
import { DecisionUtil } from "./decision.util";
import type { FailMode, FailSafeOptions, RateLimiterDecision } from "../types";

/**
 * Wraps a limiter whose store can fail (Redis) and decides what the user gets when it does:
 * fail open = allow (the API stays up, the limit is off for a while),
 * fail closed = reject (the limit always holds, the API is down with Redis).
 */
export class FailSafeLimiter implements RateLimiter {
    private readonly limiter: RateLimiter;
    private readonly mode: FailMode;
    private readonly limit: number;
    // Log once when the store goes down and once when it's back, not on every request
    private failing = false;

    constructor(limiter: RateLimiter, options: FailSafeOptions) {
        this.limiter = limiter;
        this.mode = options.mode;
        this.limit = options.limit;
    }

    public async init(): Promise<void> {
        await this.limiter.init?.();
    }

    async isAllowed(key: string): Promise<RateLimiterDecision> {
        try {
            const decision = await this.limiter.isAllowed(key);
            if (this.failing) {
                this.failing = false;
                console.info("Rate limiter store is back");
            }
            return decision;
        } catch (err) {
            if (!this.failing) {
                this.failing = true;
                console.error(`Rate limiter store failed, failing ${this.mode}: ${err instanceof Error ? err.message : err}`);
            }
            return this.mode === "open" ? DecisionUtil.allow(this.limit, this.limit, 0) : DecisionUtil.block(this.limit, 1);
        }
    }

    public async close(): Promise<void> {
        await this.limiter.close?.();
    }
}
