import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/api", (req, res) => {
  res.json({ ok: true, server: PORT });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
