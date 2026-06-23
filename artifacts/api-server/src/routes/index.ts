import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import eventsRouter from "./events";
import statsRouter from "./stats";
import agentsRouter from "./agents";
import whatsappRouter from "./whatsapp";
import conversationsRouter from "./conversations";

const router: IRouter = Router();

// Rotas públicas e sem requireAuth global
router.use(healthRouter);
router.use(authRouter);

// SSE e stats usam auth própria via token query param ou requireAuth inline
// Devem vir ANTES dos routers que fazem router.use(requireAuth) globalmente
router.use(eventsRouter);
router.use(statsRouter);

// Routers protegidos (aplicam requireAuth internamente para todas as rotas)
router.use(agentsRouter);
router.use(whatsappRouter);
router.use(conversationsRouter);

export default router;
