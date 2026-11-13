/**
 * Where a limiter keeps its counts. The demo page groups its tabs by this.
 */
export type LimiterStore = "memory" | "redis-naive" | "redis-lua";
