import type { RateLimiter } from "../interfaces";

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
     * Settings the demo page needs to draw (e.g. limit, windowMs).
     */
    config: Record<string, number>;

    limiter: RateLimiter;
};
