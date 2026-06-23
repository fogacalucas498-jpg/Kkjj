import { Router } from "express";
import { db, pool, agentsTable, whatsappSessionsTable, conversationsTable, messagesTable } from "@workspace/db";
import { eq, inArray, count, gte, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  // ── Agents ──
  const agents = await db.select({ id: agentsTable.id })
    .from(agentsTable).where(eq(agentsTable.userId, userId));
  const agentIds = agents.map(a => a.id);
  const totalAgents = agentIds.length;

  // ── WhatsApp sessions ──
  let sessionIds: number[] = [];
  let connectedAgents = 0;
  if (agentIds.length > 0) {
    const sessions = await db
      .select({ id: whatsappSessionsTable.id, status: whatsappSessionsTable.status })
      .from(whatsappSessionsTable)
      .where(inArray(whatsappSessionsTable.agentId, agentIds));
    sessionIds = sessions.map(s => s.id);
    connectedAgents = sessions.filter(s => s.status === "connected").length;
  }

  // ── Conversations ──
  let convIds: number[] = [];
  let totalConversations = 0;
  if (sessionIds.length > 0) {
    const convs = await db.select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(inArray(conversationsTable.sessionId, sessionIds));
    convIds = convs.map(c => c.id);
    totalConversations = convIds.length;
  }

  // ── Messages stats ──
  let totalMessages = 0;
  let todayMessages = 0;
  let messagesPerDay: { day: string; count: number }[] = [];
  let avgResponseSecs: number | null = null;

  if (convIds.length > 0) {
    const [msgCount] = await db.select({ count: count() })
      .from(messagesTable).where(inArray(messagesTable.conversationId, convIds));
    totalMessages = Number(msgCount?.count ?? 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [todayCount] = await db.select({ count: count() }).from(messagesTable)
      .where(and(
        inArray(messagesTable.conversationId, convIds),
        gte(messagesTable.createdAt, todayStart)
      ));
    todayMessages = Number(todayCount?.count ?? 0);

    // Messages per day – last 7 days using raw SQL with pg Pool
    const perDay = await pool.query<{ day: string; count: string }>(
      `SELECT DATE(created_at)::text AS day, COUNT(*)::int AS count
       FROM messages
       WHERE conversation_id = ANY($1::int[])
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY day`,
      [convIds]
    );
    messagesPerDay = perDay.rows.map(r => ({ day: r.day, count: Number(r.count) }));

    // Avg response time: time from user message → next assistant message
    const avgRaw = await pool.query<{ avg_seconds: string | null }>(
      `SELECT AVG(EXTRACT(EPOCH FROM (next_ts - ts)))::int AS avg_seconds
       FROM (
         SELECT
           created_at           AS ts,
           LEAD(created_at) OVER (PARTITION BY conversation_id ORDER BY created_at) AS next_ts,
           role,
           LEAD(role)  OVER (PARTITION BY conversation_id ORDER BY created_at) AS next_role
         FROM messages
         WHERE conversation_id = ANY($1::int[])
       ) t
       WHERE role = 'user' AND next_role = 'assistant'`,
      [convIds]
    );
    const raw = avgRaw.rows[0]?.avg_seconds;
    avgResponseSecs = raw != null ? Number(raw) : null;
  }

  res.json({
    totalAgents,
    connectedAgents,
    totalConversations,
    totalMessages,
    todayMessages,
    messagesPerDay,
    avgResponseSecs,
  });
});

export default router;
