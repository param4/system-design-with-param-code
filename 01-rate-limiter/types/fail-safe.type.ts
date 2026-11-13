/**
 * What a limiter answers when its store (Redis) is down:
 * "open" lets the request through (the API stays up),
 * "closed" rejects it (the limit always holds).
 */
export type FailMode = "open" | "closed";

export type FailSafeOptions = {
    mode: FailMode;

    /**
     * Reported in the decision, since the failed limiter could not say.
     */
    limit: number;
};
