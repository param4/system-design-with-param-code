import express, { Router } from "express";
import { cors } from "../middlewares";
import type { LimiterEntry } from "../types";

/**
 * Demo scaffolding only, not part of the rate limiter:
 * the visual test page, CORS for the 2-server demo, and the list of algorithms the page shows.
 * Mount it before the limiter routes, so CORS applies to them too.
 */
export function demoRoutes(limiters: LimiterEntry[]): Router {
    const router = Router();

    router.use(express.static(`${import.meta.dirname}/../public`));
    router.use(cors);

    router.get("/meta/limiters", (req, res) => {
        res.json(limiters.map(({ name, label, config }) => ({ name, label, config })));
    });

    return router;
}
