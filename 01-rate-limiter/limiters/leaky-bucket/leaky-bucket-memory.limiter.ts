import type { RateLimiter } from "../../interfaces";
import { allow, block, toSeconds } from "../decision";
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
        const queue = this.queueFor(key);

        if (queue.length >= this.capacity) return block(this.capacity, this.drainSeconds(queue.length), this.drainSeconds(1));

        // Wait in line: the worker resolves this when it lets the request out
        return new Promise<RateLimiterDecision>((resolve) => queue.push({ resolve }));
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
        return toSeconds(n * this.leakEveryMs);
    }

    private leak(): void {
        for (const [key, queue] of this.queues) {
            const next = queue.shift();
            if (!next) {
                this.queues.delete(key);
                continue;
            }
            next.resolve(allow(this.capacity, this.capacity - queue.length, this.drainSeconds(queue.length)));
        }
    }

    public async close(): Promise<void> {
        clearInterval(this.worker);
        this.worker = undefined;

        // Don't leave waiting requests hanging on shutdown
        for (const queue of this.queues.values()) {
            for (const waiting of queue) {
                waiting.resolve(block(this.capacity, 1));
            }
        }
        this.queues.clear();
    }
}
