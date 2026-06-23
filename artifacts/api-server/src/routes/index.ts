import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import eventsRouter from "./events";
import agentsRouter from "./agents";
import whatsappRouter from "./whatsapp";
import conversationsRouter from "./conversations";

const router: IRouter = Router();

// health e auth: sem autenticação
router.use(healthRouter);
router.use(authRouter);

// SSE: usa auth própria por query param — deve vir ANTES dos routers que têm router.use(requireAuth) global
router.use(eventsRouter);

// Routers protegidos (aplicam requireAuth internamente)
router.use(agentsRouter);
router.use(whatsappRouter);
router.use(conversationsRouter);

export default router;
