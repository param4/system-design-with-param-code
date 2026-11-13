import { createApp } from "./app";
import { createLimiters } from "./limiters/registry";
import { createRedisClient } from "./redis";

const PORT = Number(process.env.PORT ?? 3000);

// 1. Build and start the limiters before taking traffic (the Redis ones share one connection)
const redis = createRedisClient();
const limiters = createLimiters(redis);
for (const { limiter } of limiters) await limiter.init?.();

// 2. Serve
const server = createApp(limiters, PORT).listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// 3. Shut down in reverse order
const shutdown = async () => {
  server.close();
  for (const { limiter } of limiters) await limiter.close?.();
  // quit waits for pending replies; if Redis is down it can't be sent, so just drop the connection
  await redis.quit().catch(() => redis.disconnect());
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
