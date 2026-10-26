import type { LimiterEntry } from "../types";
import { FixedWindowMemoryLimiter } from "./fixed-window/fixed-window-memory.limiter";

/**
 * Every algorithm the app serves. Add one entry here, and its route (/api/<name>)
 * and its tab on the demo page follow automatically.
 */
export function createLimiters(): LimiterEntry[] {
    const fixedWindow = { limit: 5, windowMs: 10_000 };

    return [
        { name: "fixed-window", label: "Fixed window", config: fixedWindow, limiter: new FixedWindowMemoryLimiter(fixedWindow) },
    ];
}
