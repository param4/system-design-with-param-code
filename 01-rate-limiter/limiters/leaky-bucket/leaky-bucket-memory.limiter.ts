import type { RateLimiter } from "../../interfaces";
import { DecisionUtil } from "../decision.util";
import type { LeakyBucketOptions, RateLimiterDecision } from "../../types";

type Waiting = {
    resolve: (decision: RateLimiterDecision) => void;
};

/**
 * Requests wait in a per-key queue; a worker lets one per key out at a fixed rate.
 * isAllowed() resolves when the request leaves the queue, so output is smooth.
 */
export class LeakyBucketMemoryLimiter implements RateLimiter {
    private readonly capacity: number;
    private readonly leakEveryMs: number;
    private readonly queues = new Map<string, Waiting[]>();
    private worker: NodeJS.Timeout | undefined;

    constructor(options: LeakyBucketOptions) {
        this.capacity = options.capacity;
        this.leakEveryMs = 1000 / options.leakPerSecond;
    }

    public async init(): Promise<void> {
        if (this.worker) return;
        this.worker = setInterval(() => this.leak(), this.leakEveryMs).unref();
    }

    async isAllowed(key: string): Promise<RateLimiterDecision> {
        // TODO: write it on video
        throw new Error("Not implemented yet");
    }

    private queueFor(key: string): Waiting[] {
        const queue = this.queues.get(key) ?? [];
        this.queues.set(key, queue);
        return queue;
    }

    /**
     * Seconds until the queue has let out n requests.
     */
    private drainSeconds(n: number): number {
        return DecisionUtil.toSeconds(n * this.leakEveryMs);
    }

    private leak(): void {
        for (const [key, queue] of this.queues) {
            const next = queue.shift();
            if (!next) {
                this.queues.delete(key);
                continue;
            }
            next.resolve(DecisionUtil.allow(this.capacity, this.capacity - queue.length, this.drainSeconds(queue.length)));
        }
    }

    public async close(): Promise<void> {
        clearInterval(this.worker);
        this.worker = undefined;

        // Don't leave waiting requests hanging on shutdown
        for (const queue of this.queues.values()) {
            for (const waiting of queue) {
                waiting.resolve(DecisionUtil.block(this.capacity, 1));
            }
        }
        this.queues.clear();
    }
}
