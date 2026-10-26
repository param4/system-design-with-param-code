export type FixedWindowOptions = {
    /**
     * The maximum number of requests allowed within the time window.
     */
    limit: number;

    /**
     * The time window in milliseconds.
     */
    windowMs: number;

    /**
     * A function that returns the current time in milliseconds.
     */
    now?: () => number;
}