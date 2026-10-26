import express, { type Express } from "express";
import { demoRoutes, limiterRoutes } from "./routes";
import type { LimiterEntry } from "./types";

/**
 * Builds the app without listening, so tests can use it without opening a port.
 */
export function createApp(limiters: LimiterEntry[], port: number): Express {
    const app = express();

    app.use(demoRoutes(limiters));
    app.use(limiterRoutes(limiters, port));

    return app;
}
