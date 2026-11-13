import type { TokenBucketOptions } from "./bucket.type";

export type TokenBucketRedisNaiveOptions = Omit<TokenBucketOptions, "now"> & {
    /**
     * Pause between the read and the write, in milliseconds.
     * Real servers have this gap too (network, GC); widening it makes the race show on a laptop.
     */
    gapMs?: number;
};
