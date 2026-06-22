import { Router } from "express";
import { db, agentsTable, knowledgeTable, whatsappSessionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();
router.use(requireAuth);

router.get("/agents", async (req: AuthRequest, res) => {
  const agents = await db.select().from(agentsTable).where(eq(agentsTable.userId, req.userId!));
  const withStatus = await Promise.all(agents.map(async (a) => {
    const [session] = await db.select({ status: whatsappSessionsTable.status, phoneNumber: whatsappSessionsTable.phoneNumber })
      .from(whatsappSessionsTable).where(eq(whatsappSessionsTable.agentId, a.id)).limit(1);
    return { ...a, whatsapp: session ?? null };
  }));
  res.json(withStatus);
});

router.post("/agents", async (req: AuthRequest, res) => {
  const { name, description, instructions } = req.body;
  if (!name) { res.status(400).json({ error: "Nome é obrigatório" }); return; }
  const [agent] = await db.insert(agentsTable).values({
    userId: req.userId!, name, description: description ?? "", instructions: instructions ?? ""
  }).returning();
  res.status(201).json(agent);
});

router.get("/agents/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  const [agent] = await db.select().from(agentsTable)
    .where(and(eq(agentsTable.id, id), eq(agentsTable.userId, req.userId!))).limit(1);
  if (!agent) { res.status(404).json({ error: "Agente não encontrado" }); return; }
  const knowledge = await db.select().from(knowledgeTable).where(eq(knowledgeTable.agentId, id));
  const [session] = await db.select().from(whatsappSessionsTable).where(eq(whatsappSessionsTable.agentId, id)).limit(1);
  res.json({ ...agent, knowledge, whatsapp: session ?? null });
});

router.put("/agents/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  const { name, description, instructions } = req.body;
  const [agent] = await db.update(agentsTable)
    .set({ name, description, instructions, updatedAt: new Date() })
    .where(and(eq(agentsTable.id, id), eq(agentsTable.userId, req.userId!)))
    .returning();
  if (!agent) { res.status(404).json({ error: "Agente não encontrado" }); return; }
  res.json(agent);
});

router.delete("/agents/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  await db.delete(agentsTable).where(and(eq(agentsTable.id, id), eq(agentsTable.userId, req.userId!)));
  res.json({ ok: true });
});

router.get("/agents/:id/knowledge", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  const [agent] = await db.select({ id: agentsTable.id }).from(agentsTable)
    .where(and(eq(agentsTable.id, id), eq(agentsTable.userId, req.userId!))).limit(1);
  if (!agent) { res.status(404).json({ error: "Agente não encontrado" }); return; }
  const items = await db.select().from(knowledgeTable).where(eq(knowledgeTable.agentId, id));
  res.json(items);
});

router.post("/agents/:id/knowledge", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  const { title, content } = req.body;
  if (!title || !content) { res.status(400).json({ error: "Título e conteúdo são obrigatórios" }); return; }
  const [agent] = await db.select({ id: agentsTable.id }).from(agentsTable)
    .where(and(eq(agentsTable.id, id), eq(agentsTable.userId, req.userId!))).limit(1);
  if (!agent) { res.status(404).json({ error: "Agente não encontrado" }); return; }
  const [item] = await db.insert(knowledgeTable).values({ agentId: id, title, content }).returning();
  res.status(201).json(item);
});

router.delete("/agents/:id/knowledge/:kid", async (req: AuthRequest, res) => {
  const kid = Number(req.params["kid"]);
  await db.delete(knowledgeTable).where(eq(knowledgeTable.id, kid));
  res.json({ ok: true });
});

export default router;
