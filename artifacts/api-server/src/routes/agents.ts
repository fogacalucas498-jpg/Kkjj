import { Router } from "express";
import { db, agentsTable, knowledgeTable, whatsappSessionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();
router.use(requireAuth);

/* ── helpers ── */
async function withStatus(agentId: number) {
  const [session] = await db.select({ status: whatsappSessionsTable.status, phoneNumber: whatsappSessionsTable.phoneNumber })
    .from(whatsappSessionsTable).where(eq(whatsappSessionsTable.agentId, agentId)).limit(1);
  return session ?? null;
}

async function verifyOwner(agentId: number, userId: number) {
  const [a] = await db.select({ id: agentsTable.id }).from(agentsTable)
    .where(and(eq(agentsTable.id, agentId), eq(agentsTable.userId, userId))).limit(1);
  return a ?? null;
}

/* ── List ── */
router.get("/agents", async (req: AuthRequest, res) => {
  const agents = await db.select().from(agentsTable).where(eq(agentsTable.userId, req.userId!));
  const withStatus = await Promise.all(agents.map(async (a) => ({
    ...a, whatsapp: await withStatus(a.id)
  })));
  res.json(withStatus);
});

/* ── Create ── */
router.post("/agents", async (req: AuthRequest, res) => {
  const { name, description, instructions } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "Nome é obrigatório" }); return; }
  const [agent] = await db.insert(agentsTable).values({
    userId: req.userId!, name: name.trim(), description: description ?? "", instructions: instructions ?? ""
  }).returning();
  res.status(201).json(agent);
});

/* ── Import from JSON ── */
router.post("/agents/import", async (req: AuthRequest, res) => {
  const { name, description, instructions, knowledge } = req.body;

  if (!name?.trim()) {
    res.status(400).json({ error: "O JSON deve conter um campo 'name' não vazio." }); return;
  }
  if (name.length > 200) {
    res.status(400).json({ error: "Nome deve ter no máximo 200 caracteres." }); return;
  }
  if (knowledge !== undefined && !Array.isArray(knowledge)) {
    res.status(400).json({ error: "Campo 'knowledge' deve ser um array." }); return;
  }
  const knowledgeItems: { title: string; content: string }[] = knowledge ?? [];
  if (knowledgeItems.length > 100) {
    res.status(400).json({ error: "Máximo de 100 itens de conhecimento permitidos." }); return;
  }
  for (const item of knowledgeItems) {
    if (!item.title?.trim() || !item.content?.trim()) {
      res.status(400).json({ error: "Cada item de conhecimento deve ter 'title' e 'content' não vazios." }); return;
    }
    if (item.content.length > 100_000) {
      res.status(400).json({ error: `Conteúdo do item "${item.title}" excede o limite de 100.000 caracteres.` }); return;
    }
  }

  const [agent] = await db.insert(agentsTable).values({
    userId: req.userId!,
    name: name.trim(),
    description: description?.trim() ?? "",
    instructions: instructions?.trim() ?? "",
  }).returning();

  if (knowledgeItems.length > 0) {
    await db.insert(knowledgeTable).values(
      knowledgeItems.map(k => ({ agentId: agent!.id, title: k.title.trim(), content: k.content.trim() }))
    );
  }

  const fullAgent = await db.select().from(agentsTable).where(eq(agentsTable.id, agent!.id)).limit(1);
  const knowledge2 = await db.select().from(knowledgeTable).where(eq(knowledgeTable.agentId, agent!.id));
  res.status(201).json({ ...fullAgent[0], knowledge: knowledge2, whatsapp: null });
});

/* ── Get one ── */
router.get("/agents/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const [agent] = await db.select().from(agentsTable)
    .where(and(eq(agentsTable.id, id), eq(agentsTable.userId, req.userId!))).limit(1);
  if (!agent) { res.status(404).json({ error: "Agente não encontrado" }); return; }
  const knowledge = await db.select().from(knowledgeTable).where(eq(knowledgeTable.agentId, id));
  const [session] = await db.select().from(whatsappSessionsTable).where(eq(whatsappSessionsTable.agentId, id)).limit(1);
  res.json({ ...agent, knowledge, whatsapp: session ?? null });
});

/* ── Update ── */
router.put("/agents/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const { name, description, instructions } = req.body;
  const [agent] = await db.update(agentsTable)
    .set({ name, description, instructions, updatedAt: new Date() })
    .where(and(eq(agentsTable.id, id), eq(agentsTable.userId, req.userId!)))
    .returning();
  if (!agent) { res.status(404).json({ error: "Agente não encontrado" }); return; }
  res.json(agent);
});

/* ── Delete ── */
router.delete("/agents/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  await db.delete(agentsTable).where(and(eq(agentsTable.id, id), eq(agentsTable.userId, req.userId!)));
  res.json({ ok: true });
});

/* ── Export as JSON ── */
router.get("/agents/:id/export", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const [agent] = await db.select().from(agentsTable)
    .where(and(eq(agentsTable.id, id), eq(agentsTable.userId, req.userId!))).limit(1);
  if (!agent) { res.status(404).json({ error: "Agente não encontrado" }); return; }
  const knowledge = await db.select({ title: knowledgeTable.title, content: knowledgeTable.content })
    .from(knowledgeTable).where(eq(knowledgeTable.agentId, id));
  const exported = {
    version: "1",
    exportedAt: new Date().toISOString(),
    name: agent.name,
    description: agent.description,
    instructions: agent.instructions,
    knowledge,
  };
  res.json(exported);
});

/* ── Duplicate ── */
router.post("/agents/:id/duplicate", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const [agent] = await db.select().from(agentsTable)
    .where(and(eq(agentsTable.id, id), eq(agentsTable.userId, req.userId!))).limit(1);
  if (!agent) { res.status(404).json({ error: "Agente não encontrado" }); return; }

  const knowledge = await db.select({ title: knowledgeTable.title, content: knowledgeTable.content })
    .from(knowledgeTable).where(eq(knowledgeTable.agentId, id));

  const [newAgent] = await db.insert(agentsTable).values({
    userId: req.userId!,
    name: `${agent.name} (Cópia)`,
    description: agent.description,
    instructions: agent.instructions,
  }).returning();

  if (knowledge.length > 0) {
    await db.insert(knowledgeTable).values(
      knowledge.map(k => ({ agentId: newAgent!.id, title: k.title, content: k.content }))
    );
  }

  const fullKnowledge = await db.select().from(knowledgeTable).where(eq(knowledgeTable.agentId, newAgent!.id));
  res.status(201).json({ ...newAgent, knowledge: fullKnowledge, whatsapp: null });
});

/* ── Knowledge ── */
router.get("/agents/:id/knowledge", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  if (!await verifyOwner(id, req.userId!)) { res.status(404).json({ error: "Agente não encontrado" }); return; }
  res.json(await db.select().from(knowledgeTable).where(eq(knowledgeTable.agentId, id)));
});

router.post("/agents/:id/knowledge", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  const { title, content } = req.body;
  if (!title?.trim() || !content?.trim()) { res.status(400).json({ error: "Título e conteúdo são obrigatórios" }); return; }
  if (!await verifyOwner(id, req.userId!)) { res.status(404).json({ error: "Agente não encontrado" }); return; }
  const [item] = await db.insert(knowledgeTable).values({ agentId: id, title: title.trim(), content: content.trim() }).returning();
  res.status(201).json(item);
});

router.delete("/agents/:id/knowledge/:kid", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  const kid = Number(req.params["kid"]);
  if (isNaN(id) || isNaN(kid)) { res.status(400).json({ error: "ID inválido" }); return; }
  if (!await verifyOwner(id, req.userId!)) { res.status(404).json({ error: "Agente não encontrado" }); return; }
  await db.delete(knowledgeTable).where(and(eq(knowledgeTable.id, kid), eq(knowledgeTable.agentId, id)));
  res.json({ ok: true });
});

export default router;
