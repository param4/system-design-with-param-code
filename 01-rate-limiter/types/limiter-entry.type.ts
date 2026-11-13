import type { RateLimiter } from "../interfaces";
import type { LimiterStore } from "./limiter-store.type";

export type LimiterEntry = {
    /**
     * URL-safe id, used as the route: /api/<name>.
     */
    name: string;

    /**
     * Human-readable name for the demo page.
     */
    label: string;

    /**
     * Where it keeps its counts: memory, Redis (naive) or Redis (Lua).
     */
    store: LimiterStore;

    /**
     * Settings the demo page needs to draw (e.g. limit, windowMs).
     */
    config: Record<string, number>;

    limiter: RateLimiter;
};
