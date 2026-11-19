import type { RateLimiter } from "../../interfaces";
import { allow, block, toSeconds } from "../decision";
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
        const counter = this.counterFor(key, currentTime);
        const resetAfterSeconds = toSeconds(counter.windowStart + this.windowMs - currentTime);

        if (counter.count >= this.limit) return block(this.limit, resetAfterSeconds);

        counter.count += 1;
        return allow(this.limit, this.limit - counter.count, resetAfterSeconds);
    }

    /**
     * The key's counter for the window `time` falls in. A new window starts again from 0.
     */
    private counterFor(key: string, time: number): WindowCounter {
        const windowStart = this.windowStartOf(time);
        let counter = this.counters.get(key);
        if (!counter || counter.windowStart !== windowStart) {
            counter = { windowStart, count: 0 };
            this.counters.set(key, counter);
        }
        return counter;
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
