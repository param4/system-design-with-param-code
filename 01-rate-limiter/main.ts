import express from "express";
import { FixedWindowMemoryLimiter } from "./limiters/fixed-window/fixed-window-memory.limiter";
import { rateLimit } from "./middlewares";

const PORT = Number(process.env.PORT ?? 3000);

// 1. Build and start the limiter before taking traffic
const limiter = new FixedWindowMemoryLimiter({ limit: 5, windowMs: 10_000 });
await limiter.init?.();

// 2. Wire it in
const app = express();
app.use("/api", rateLimit(limiter));

app.get("/api", (req, res) => {
  res.json({ ok: true, server: PORT });
});

// 3. Serve
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// 4. Shut down in reverse order
const shutdown = async () => {
  server.close();
  await limiter.close?.();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
