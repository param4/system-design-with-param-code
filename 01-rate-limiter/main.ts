import { createApp } from "./app";
import { createLimiters } from "./limiters/registry";

const PORT = Number(process.env.PORT ?? 3000);

// 1. Build and start the limiters before taking traffic
const limiters = createLimiters();
for (const { limiter } of limiters) await limiter.init?.();

// 2. Serve
const server = createApp(limiters, PORT).listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// 3. Shut down in reverse order
const shutdown = async () => {
  server.close();
  for (const { limiter } of limiters) await limiter.close?.();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
