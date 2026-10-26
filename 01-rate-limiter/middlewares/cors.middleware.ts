import type { NextFunction, Request, Response } from "express";

/**
 * Lets the demo page call other ports (2-server demo) and read the rate limit headers.
 * Preflight (OPTIONS) is answered here, so it never reaches the limiter and never uses up quota.
 */
export function cors(req: Request, res: Response, next: NextFunction): void {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "x-user-id");
    res.setHeader("Access-Control-Expose-Headers", "RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After");

    if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
    }

    next();
}
