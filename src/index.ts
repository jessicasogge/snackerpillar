import express from "express";

export const app = express();
app.use(express.static("public"));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT) || 3007;

// Start listening unless a test imported the app.
if (!process.env.VITEST) {
  app.listen(port, () => console.log(`Snackerpillar is running at http://localhost:${port}`));
}
