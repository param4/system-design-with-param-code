export type TokenBucketOptions = {
    /**
     * Bucket size: the biggest burst allowed.
     */
    capacity: number;

    /**
     * Tokens added per second: the average rate.
     */
    refillPerSecond: number;

    /**
     * A function that returns the current time in milliseconds.
     */
    now?: () => number;
}

export type LeakyBucketOptions = {
    /**
     * Queue size: how many requests can wait.
     */
    capacity: number;

    /**
     * Requests let out per second: the steady output rate.
     */
    leakPerSecond: number;
}
