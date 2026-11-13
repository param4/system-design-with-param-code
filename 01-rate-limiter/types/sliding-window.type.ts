import type { FixedWindowOptions } from "./fixed-window.type";

/**
 * Same knobs as the fixed window: at most `limit` requests in any `windowMs`.
 */
export type SlidingLogOptions = FixedWindowOptions;

/**
 * Same knobs as the fixed window: at most `limit` requests in any `windowMs` (estimated).
 */
export type SlidingCounterOptions = FixedWindowOptions;
