import type { RateLimiter } from "../../interfaces";
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
        const queue = this.queues.get(key) ?? [];
        this.queues.set(key, queue);

        // Seconds until the queue has drained n requests
        const drainSeconds = (n: number) => Math.ceil((n * this.leakEveryMs) / 1000);

        if (queue.length >= this.capacity) return {
            allowed: false,
            limit: this.capacity,
            requestsRemaining: 0,
            resetAfterSeconds: drainSeconds(queue.length),
            retryAfterSeconds: drainSeconds(1),
        };

        return new Promise<RateLimiterDecision>((resolve) => queue.push({ resolve }));
    }

    private leak(): void {
        for (const [key, queue] of this.queues) {
            const next = queue.shift();
            if (!next) {
                this.queues.delete(key);
                continue;
            }
            next.resolve({
                allowed: true,
                limit: this.capacity,
                requestsRemaining: this.capacity - queue.length,
                resetAfterSeconds: Math.ceil((queue.length * this.leakEveryMs) / 1000),
                retryAfterSeconds: 0,
            });
        }
    }

    public async close(): Promise<void> {
        clearInterval(this.worker);
        this.worker = undefined;

        // Don't leave waiting requests hanging on shutdown
        for (const queue of this.queues.values()) {
            for (const waiting of queue) {
                waiting.resolve({ allowed: false, limit: this.capacity, requestsRemaining: 0, resetAfterSeconds: 1, retryAfterSeconds: 1 });
            }
        }
        this.queues.clear();
    }
}
