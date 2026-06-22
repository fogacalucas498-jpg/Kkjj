import { Router } from "express";
import { db, conversationsTable, messagesTable, whatsappSessionsTable, agentsTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();
router.use(requireAuth);

async function getUserSessionIds(userId: number): Promise<number[]> {
  const agents = await db.select({ id: agentsTable.id }).from(agentsTable)
    .where(eq(agentsTable.userId, userId));
  if (agents.length === 0) return [];
  const agentIds = agents.map(a => a.id);
  const sessions = await db.select({ id: whatsappSessionsTable.id }).from(whatsappSessionsTable)
    .where(inArray(whatsappSessionsTable.agentId, agentIds));
  return sessions.map(s => s.id);
}

router.get("/conversations", async (req: AuthRequest, res) => {
  const sessionIds = await getUserSessionIds(req.userId!);
  if (sessionIds.length === 0) { res.json([]); return; }
  const convs = await db.select().from(conversationsTable)
    .where(inArray(conversationsTable.sessionId, sessionIds))
    .orderBy(desc(conversationsTable.lastMessageAt));
  res.json(convs);
});

router.get("/conversations/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  const sessionIds = await getUserSessionIds(req.userId!);
  if (sessionIds.length === 0) { res.status(404).json({ error: "Conversa não encontrada" }); return; }
  const [conv] = await db.select().from(conversationsTable)
    .where(and(eq(conversationsTable.id, id), inArray(conversationsTable.sessionId, sessionIds))).limit(1);
  if (!conv) { res.status(404).json({ error: "Conversa não encontrada" }); return; }
  const msgs = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, id)).orderBy(messagesTable.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.post("/conversations/:id/messages", async (req: AuthRequest, res) => {
  const id = Number(req.params["id"]);
  const { content } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: "Conteúdo é obrigatório" }); return; }
  const sessionIds = await getUserSessionIds(req.userId!);
  if (sessionIds.length === 0) { res.status(404).json({ error: "Conversa não encontrada" }); return; }
  const [conv] = await db.select({ id: conversationsTable.id }).from(conversationsTable)
    .where(and(eq(conversationsTable.id, id), inArray(conversationsTable.sessionId, sessionIds))).limit(1);
  if (!conv) { res.status(404).json({ error: "Conversa não encontrada" }); return; }
  const [msg] = await db.insert(messagesTable).values({ conversationId: id, content: content.trim(), role: "assistant" }).returning();
  await db.update(conversationsTable).set({ lastMessage: content.trim(), lastMessageAt: new Date() })
    .where(eq(conversationsTable.id, id));
  res.status(201).json(msg);
});

export default router;
