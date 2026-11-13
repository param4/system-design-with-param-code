import { Redis } from "ioredis";

const DEFAULT_REDIS_URL = "redis://localhost:6379";

/**
 * One Redis connection, shared by every Redis limiter.
 * Tuned so a dead Redis fails a request fast instead of hanging it;
 * the limiter's fail mode then decides what the user gets.
 */
export function createRedisClient(url = process.env.REDIS_URL ?? DEFAULT_REDIS_URL): Redis {
    const redis = new Redis(url, {
        // Redis is up but stuck: give up after 300 ms
        commandTimeout: 300,
        // Redis is down: fail now, don't queue commands to replay later (they would use up quota)
        enableOfflineQueue: false,
    });

    // Without a listener, ioredis prints every reconnect error as "Unhandled error event".
    // A refused connection to localhost can have an empty message, so fall back to its code (ECONNREFUSED).
    redis.on("error", (err: NodeJS.ErrnoException) => console.error(`Redis: ${err.message || err.code}`));

    return redis;
}
