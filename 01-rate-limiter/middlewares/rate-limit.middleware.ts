import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { RateLimiter } from "../interfaces";

export type RateLimitMiddlewareOptions = {
    /**
     * Who is being limited. Defaults to the x-user-id header, then the client IP.
     */
    keyOf?: (req: Request) => string;
};

const defaultKeyOf = (req: Request): string =>
    req.header("x-user-id") ?? req.ip ?? "anonymous";

export function rateLimit(limiter: RateLimiter, options: RateLimitMiddlewareOptions = {}): RequestHandler {
    const keyOf = options.keyOf ?? defaultKeyOf;

    return async (req: Request, res: Response, next: NextFunction) => {
        const decision = await limiter.isAllowed(keyOf(req));

        res.setHeader("RateLimit-Limit", decision.limit);
        res.setHeader("RateLimit-Remaining", decision.requestsRemaining);
        res.setHeader("RateLimit-Reset", decision.resetAfterSeconds);

        if (!decision.allowed) {
            res.setHeader("Retry-After", decision.retryAfterSeconds);
            res.status(429).json({ error: "Too Many Requests", retryAfterSeconds: decision.retryAfterSeconds });
            return;
        }

        next();
    };
}
