import { EventEmitter } from "events";
import { db, whatsappSessionsTable, conversationsTable, messagesTable, agentsTable, knowledgeTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

interface SessionState {
  status: "connecting" | "qr" | "connected" | "disconnected";
  qr?: string;
  phoneNumber?: string;
  sock?: any;
}

class WhatsAppManager extends EventEmitter {
  private sessions = new Map<number, SessionState>();

  getState(agentId: number): SessionState | undefined {
    return this.sessions.get(agentId);
  }

  async reconnectPersisted() {
    try {
      const connected = await db.select({ agentId: whatsappSessionsTable.agentId })
        .from(whatsappSessionsTable)
        .where(eq(whatsappSessionsTable.status, "connected"));
      for (const { agentId } of connected) {
        logger.info({ agentId }, "Auto-reconnecting persisted WhatsApp session");
        this.connect(agentId).catch(() => {});
      }
    } catch (err) {
      logger.error({ err }, "Failed to reconnect persisted sessions");
    }
  }

  async connect(agentId: number) {
    const existing = this.sessions.get(agentId);
    if (existing?.status === "connected" || existing?.status === "connecting" || existing?.status === "qr") return;

    this.sessions.set(agentId, { status: "connecting" });

    try {
      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = await import("@whiskeysockets/baileys") as any;

      const authDir = `/tmp/wa-session-${agentId}`;
      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: { level: "silent", info() {}, warn() {}, error() {}, debug() {}, trace() {}, child() { return this; } },
        browser: ["Robô de Vendas", "Chrome", "1.0"],
      });

      const sessionState: SessionState = { status: "connecting", sock };
      this.sessions.set(agentId, sessionState);

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const QRCode = (await import("qrcode")).default;
            const qrDataURL = await QRCode.toDataURL(qr);
            sessionState.status = "qr";
            sessionState.qr = qrDataURL;
            this.sessions.set(agentId, { ...sessionState });
            await db.update(whatsappSessionsTable).set({ status: "qr", qrCode: qrDataURL, updatedAt: new Date() })
              .where(eq(whatsappSessionsTable.agentId, agentId));
          } catch (err) {
            logger.error({ err }, "QR generation error");
          }
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== DisconnectReason.forbidden;
          sessionState.status = "disconnected";
          sessionState.qr = undefined;
          this.sessions.set(agentId, { ...sessionState });
          await db.update(whatsappSessionsTable).set({ status: "disconnected", qrCode: null, updatedAt: new Date() })
            .where(eq(whatsappSessionsTable.agentId, agentId));
          if (shouldReconnect) {
            setTimeout(() => this.connect(agentId), 5000);
          }
        }

        if (connection === "open") {
          const phone = sock.user?.id?.split(":")[0] ?? null;
          sessionState.status = "connected";
          sessionState.phoneNumber = phone;
          sessionState.qr = undefined;
          this.sessions.set(agentId, { ...sessionState });
          await db.update(whatsappSessionsTable).set({ status: "connected", qrCode: null, phoneNumber: phone, updatedAt: new Date() })
            .where(eq(whatsappSessionsTable.agentId, agentId));
        }
      });

      sock.ev.on("messages.upsert", async ({ messages }: any) => {
        for (const msg of messages) {
          if (msg.key.fromMe || !msg.message) continue;
          const text = msg.message.conversation
            || msg.message.extendedTextMessage?.text
            || msg.message.imageMessage?.caption
            || "";
          if (!text.trim()) continue;

          const contactPhone = msg.key.remoteJid?.replace("@s.whatsapp.net", "") ?? "";
          if (!contactPhone) continue;
          const contactName = msg.pushName ?? contactPhone;

          const [session] = await db.select().from(whatsappSessionsTable)
            .where(eq(whatsappSessionsTable.agentId, agentId)).limit(1);
          if (!session) continue;

          let [conv] = await db.select().from(conversationsTable)
            .where(and(
              eq(conversationsTable.contactPhone, contactPhone),
              eq(conversationsTable.sessionId, session.id)
            )).limit(1);

          if (!conv) {
            [conv] = await db.insert(conversationsTable).values({
              sessionId: session.id, contactPhone, contactName, lastMessage: text, lastMessageAt: new Date()
            }).returning();
          } else {
            await db.update(conversationsTable).set({ lastMessage: text, lastMessageAt: new Date(), contactName })
              .where(eq(conversationsTable.id, conv!.id));
          }

          await db.insert(messagesTable).values({ conversationId: conv!.id, content: text, role: "user" });

          const aiReply = await this.generateReply(agentId, conv!.id, text);
          if (aiReply) {
            await sock.sendMessage(msg.key.remoteJid, { text: aiReply });
            await db.insert(messagesTable).values({ conversationId: conv!.id, content: aiReply, role: "assistant" });
            await db.update(conversationsTable).set({ lastMessage: aiReply, lastMessageAt: new Date() })
              .where(eq(conversationsTable.id, conv!.id));
          }
        }
      });

    } catch (err) {
      logger.error({ err }, "WhatsApp connect error");
      this.sessions.set(agentId, { status: "disconnected" });
      await db.update(whatsappSessionsTable).set({ status: "disconnected", qrCode: null, updatedAt: new Date() })
        .where(eq(whatsappSessionsTable.agentId, agentId)).catch(() => {});
    }
  }

  async disconnect(agentId: number) {
    const state = this.sessions.get(agentId);
    if (state?.sock) {
      try { await state.sock.logout(); } catch {}
      try { state.sock.end(); } catch {}
    }
    this.sessions.set(agentId, { status: "disconnected" });
    await db.update(whatsappSessionsTable).set({ status: "disconnected", qrCode: null, updatedAt: new Date() })
      .where(eq(whatsappSessionsTable.agentId, agentId));
  }

  private async generateReply(agentId: number, convId: number, userMessage: string): Promise<string | null> {
    try {
      const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, agentId)).limit(1);
      if (!agent) return null;

      const [userRow] = await db.select({ openaiApiKey: usersTable.openaiApiKey })
        .from(usersTable).where(eq(usersTable.id, agent.userId)).limit(1);
      const apiKey = userRow?.openaiApiKey || process.env["OPENAI_API_KEY"];
      if (!apiKey) return null;

      const knowledge = await db.select().from(knowledgeTable).where(eq(knowledgeTable.agentId, agentId));
      const knowledgeText = knowledge.map(k => `### ${k.title}\n${k.content}`).join("\n\n");

      const history = await db.select().from(messagesTable)
        .where(eq(messagesTable.conversationId, convId));
      const last10 = history.slice(-10);

      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey });

      const systemPrompt = [
        agent.instructions || `Você é ${agent.name}, um assistente virtual inteligente. Responda sempre em português, de forma clara e educada.`,
        knowledgeText ? `\n\n## Base de Conhecimento\n${knowledgeText}` : ""
      ].join("");

      const msgs = [
        { role: "system" as const, content: systemPrompt },
        ...last10.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: userMessage }
      ];

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: msgs,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content?.trim() ?? null;
    } catch (err) {
      logger.error({ err }, "AI reply error");
      return null;
    }
  }
}

export const waManager = new WhatsAppManager();
