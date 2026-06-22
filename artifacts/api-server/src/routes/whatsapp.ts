import { Router } from "express";
import { db, whatsappSessionsTable, agentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import { waManager } from "../lib/whatsapp-manager";

const router = Router();
router.use(requireAuth);

async function verifyAgentOwner(agentId: number, userId: number) {
  const [agent] = await db.select({ id: agentsTable.id }).from(agentsTable)
    .where(and(eq(agentsTable.id, agentId), eq(agentsTable.userId, userId))).limit(1);
  return !!agent;
}

router.post("/agents/:id/whatsapp/connect", async (req: AuthRequest, res) => {
  const agentId = Number(req.params["id"]);
  if (!await verifyAgentOwner(agentId, req.userId!)) {
    res.status(404).json({ error: "Agente não encontrado" }); return;
  }
  const existing = await db.select().from(whatsappSessionsTable).where(eq(whatsappSessionsTable.agentId, agentId)).limit(1);
  if (existing.length === 0) {
    await db.insert(whatsappSessionsTable).values({ agentId, status: "connecting" });
  } else {
    await db.update(whatsappSessionsTable).set({ status: "connecting", updatedAt: new Date() })
      .where(eq(whatsappSessionsTable.agentId, agentId));
  }
  waManager.connect(agentId).catch(() => {});
  res.json({ ok: true, message: "Conectando..." });
});

router.get("/agents/:id/whatsapp/status", async (req: AuthRequest, res) => {
  const agentId = Number(req.params["id"]);
  if (!await verifyAgentOwner(agentId, req.userId!)) {
    res.status(404).json({ error: "Agente não encontrado" }); return;
  }
  const state = waManager.getState(agentId);
  const [session] = await db.select().from(whatsappSessionsTable).where(eq(whatsappSessionsTable.agentId, agentId)).limit(1);
  if (state) {
    res.json({ status: state.status, qr: state.qr ?? null, phoneNumber: state.phoneNumber ?? session?.phoneNumber ?? null });
  } else {
    res.json({ status: session?.status ?? "disconnected", qr: session?.qrCode ?? null, phoneNumber: session?.phoneNumber ?? null });
  }
});

router.post("/agents/:id/whatsapp/disconnect", async (req: AuthRequest, res) => {
  const agentId = Number(req.params["id"]);
  if (!await verifyAgentOwner(agentId, req.userId!)) {
    res.status(404).json({ error: "Agente não encontrado" }); return;
  }
  await waManager.disconnect(agentId);
  res.json({ ok: true });
});

export default router;
