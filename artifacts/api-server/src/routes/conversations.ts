import { Router } from "express";
import { db, conversationsTable, messagesTable, whatsappSessionsTable, agentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();
router.use(requireAuth);

router.get("/conversations", async (req: AuthRequest, res) => {
  const agents = await db.select({ id: agentsTable.id }).from(agentsTable)
    .where(eq(agentsTable.userId, req.userId!));
  const agentIds = agents.map(a => a.id);
  if (agentIds.length === 0) { res.json([]); return; }

  const sessions = await db.select().from(whatsappSessionsTable)
    .where(eq(whatsappSessionsTable.agentId, agentIds[0]!));
  const sessionIds = sessions.map(s => s.id);
  if (sessionIds.length === 0) { res.json([]); return; }

  const convs = await db.select().from(conversationsTable)
    .orderBy(desc(conversationsTable.lastMessageAt));
  res.json(convs);
});

router.get("/conversations/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id)).limit(1);
  if (!conv) { res.status(404).json({ error: "Conversa não encontrada" }); return; }
  const msgs = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, id)).orderBy(messagesTable.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.post("/conversations/:id/messages", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: "Conteúdo é obrigatório" }); return; }
  const [msg] = await db.insert(messagesTable).values({ conversationId: id, content, role: "assistant" }).returning();
  res.status(201).json(msg);
});

export default router;
