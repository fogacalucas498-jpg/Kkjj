import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    // Suppress noisy pings from SSE keep-alive and health checks
    autoLogging: {
      ignore: (req) => req.url === "/api/health" || req.url?.includes("/events"),
    },
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ── Global JSON error handler ────────────────────────────────────────────────
// Must have 4 parameters so Express recognises it as an error handler.
// Express 5 forwards async rejections here automatically.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number; statusCode?: number }, req: Request, res: Response, _next: NextFunction) => {
  const status = (err as any).status ?? (err as any).statusCode ?? 500;
  const message = status < 500 ? err.message : "Erro interno do servidor";
  logger.error({ err, url: req.url, method: req.method }, "Unhandled route error");
  res.status(status).json({ error: message });
});

export default app;
