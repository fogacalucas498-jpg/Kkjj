import { Router } from "express";
import { verifyToken } from "../middlewares/requireAuth";
import { sseSubscribe } from "../lib/sse-bus";

const router = Router();

router.get("/events", (req, res) => {
  const token = req.query["token"] as string | undefined;
  if (!token) { res.status(401).json({ error: "Token obrigatório" }); return; }
  const userId = verifyToken(token);
  if (!userId) { res.status(401).json({ error: "Token inválido" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`:connected uid=${userId}\n\n`);

  const unsub = sseSubscribe(userId, (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });

  const ping = setInterval(() => {
    res.write(":ping\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(ping);
    unsub();
  });
});

export default router;
