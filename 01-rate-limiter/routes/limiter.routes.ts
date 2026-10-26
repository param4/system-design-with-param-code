import { Router } from "express";
import { rateLimit } from "../middlewares";
import type { LimiterEntry } from "../types";

/**
 * One rate-limited endpoint per algorithm: GET /api/<name>.
 */
export function limiterRoutes(limiters: LimiterEntry[], port: number): Router {
    const router = Router();

    for (const { name, limiter } of limiters) {
        router.get(`/api/${name}`, rateLimit(limiter), (req, res) => {
            res.json({ ok: true, algo: name, server: port });
        });
    }

    return router;
}
