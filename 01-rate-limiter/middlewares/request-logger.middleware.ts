import type { NextFunction, Request, Response } from "express";

/**
 * Logs one line per API request once the response is sent:
 *   GET /api/fixed-window user=alice → 429 remaining=0 (1ms)
 * Preflight (OPTIONS) requests are skipped to keep the log readable.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    if (req.method === "OPTIONS") return next();

    const start = performance.now();
    res.on("finish", () => {
        const user = req.header("x-user-id") ?? req.ip;
        const remaining = res.getHeader("RateLimit-Remaining") ?? "-";
        const ms = Math.round(performance.now() - start);
        console.log(`${req.method} ${req.originalUrl} user=${user} → ${res.statusCode} remaining=${remaining} (${ms}ms)`);
    });

    next();
}
