import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import { db, whatsappSessionsTable, conversationsTable, messagesTable, agentsTable, knowledgeTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";
import { sseEmit } from "./sse-bus";

// ─── Session persistence directory ─────────────────────────────────────────
// /home/runner survives container restarts; /tmp is wiped every restart.
const SESSIONS_DIR = path.join(process.env["HOME"] ?? "/home/runner", ".wa-sessions");
fs.mkdirSync(SESSIONS_DIR, { recursive: true });

interface SessionState {
  status: "connecting" | "qr" | "connected" | "disconnected";
  qr?: string;
  phoneNumber?: string;
  sock?: any;
  reconnectAttempts: number;
}

class WhatsAppManager extends EventEmitter {
  private sessions = new Map<number, SessionState>();

  getState(agentId: number): SessionState | undefined {
    return this.sessions.get(agentId);
  }

  // ─── Auto-reconnect all sessions that were connected before restart ─────
  async reconnectPersisted() {
    try {
      const connected = await db
        .select({ agentId: whatsappSessionsTable.agentId })
        .from(whatsappSessionsTable)
        .where(eq(whatsappSessionsTable.status, "connected"));

      for (const { agentId } of connected) {
        const sessionDir = path.join(SESSIONS_DIR, String(agentId));
        // Only reconnect if we have saved credentials
        if (fs.existsSync(path.join(sessionDir, "creds.json"))) {
          logger.info({ agentId }, "Auto-reconnecting persisted WhatsApp session");
          this.connect(agentId).catch(err =>
            logger.error({ err, agentId }, "Auto-reconnect failed")
          );
        } else {
          // No credentials file — mark as disconnected so user re-scans QR
          await db
            .update(whatsappSessionsTable)
            .set({ status: "disconnected", qrCode: null, updatedAt: new Date() })
            .where(eq(whatsappSessionsTable.agentId, agentId))
            .catch(() => {});
        }
      }
    } catch (err) {
      logger.error({ err }, "Failed to reconnect persisted sessions");
    }

    // ── Watchdog: every 3 minutes check for disconnected sessions and reconnect ──
    setInterval(async () => {
      try {
        const sessions = await db
          .select({ agentId: whatsappSessionsTable.agentId })
          .from(whatsappSessionsTable)
          .where(eq(whatsappSessionsTable.status, "connected"));

        for (const { agentId } of sessions) {
          const state = this.sessions.get(agentId);
          // If DB says connected but our map doesn't have a live socket, reconnect
          if (!state || state.status === "disconnected") {
            const credsPath = path.join(SESSIONS_DIR, String(agentId), "creds.json");
            if (fs.existsSync(credsPath)) {
              logger.info({ agentId }, "Watchdog: reconnecting dropped session");
              this.sessions.delete(agentId);
              this.connect(agentId).catch(() => {});
            }
          }
        }
      } catch {}
    }, 3 * 60 * 1_000);
  }

  // ─── Connect / create Baileys socket ────────────────────────────────────
  async connect(agentId: number) {
    const existing = this.sessions.get(agentId);
    if (
      existing?.status === "connected" ||
      existing?.status === "connecting" ||
      existing?.status === "qr"
    ) return;

    const reconnectAttempts = existing?.reconnectAttempts ?? 0;
    this.sessions.set(agentId, { status: "connecting", reconnectAttempts });

    try {
      const baileys = await import("@whiskeysockets/baileys") as any;
      const {
        default: makeWASocket,
        useMultiFileAuthState,
        DisconnectReason,
        fetchLatestBaileysVersion,
        Browsers,
      } = baileys;

      const authDir = path.join(SESSIONS_DIR, String(agentId));
      fs.mkdirSync(authDir, { recursive: true });

      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      const { version } = await fetchLatestBaileysVersion();

      // Browsers.ubuntu("Chrome") is the recommended fingerprint for all devices
      // including iOS WhatsApp scanning
      const browserConfig =
        typeof Browsers?.ubuntu === "function"
          ? Browsers.ubuntu("Chrome")
          : ["Ubuntu", "Chrome", "20.0.04"];

      const sock = makeWASocket({
        version,
        auth: state,
        browser: browserConfig,
        printQRInTerminal: false,
        syncFullHistory: false,
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: 60_000,
        keepAliveIntervalMs: 25_000,
        retryRequestDelayMs: 500,
        generateHighQualityLinkPreview: false,
        // Silent logger — we use pino ourselves
        logger: {
          level: "silent",
          info() {}, warn() {}, error() {},
          debug() {}, trace() {}, fatal() {},
          child() { return this; },
        },
      });

      const sessionState: SessionState = {
        status: "connecting",
        sock,
        reconnectAttempts,
      };
      this.sessions.set(agentId, sessionState);

      sock.ev.on("creds.update", saveCreds);

      // ── Connection lifecycle ──
      sock.ev.on("connection.update", async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        // New QR code received
        if (qr) {
          try {
            const QRCode = (await import("qrcode")).default;
            const qrDataURL = await QRCode.toDataURL(qr, { width: 300 });
            sessionState.status = "qr";
            sessionState.qr = qrDataURL;
            this.sessions.set(agentId, { ...sessionState });
            await db
              .update(whatsappSessionsTable)
              .set({ status: "qr", qrCode: qrDataURL, updatedAt: new Date() })
              .where(eq(whatsappSessionsTable.agentId, agentId))
              .catch(() => {});
          } catch (err) {
            logger.error({ err, agentId }, "QR generation error");
          }
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const isLoggedOut =
            statusCode === DisconnectReason.loggedOut ||
            statusCode === DisconnectReason.forbidden ||
            statusCode === 401;

          logger.info({ agentId, statusCode, isLoggedOut }, "WhatsApp connection closed");

          sessionState.status = "disconnected";
          sessionState.qr = undefined;
          sessionState.sock = undefined;
          this.sessions.set(agentId, { ...sessionState });

          await db
            .update(whatsappSessionsTable)
            .set({ status: "disconnected", qrCode: null, updatedAt: new Date() })
            .where(eq(whatsappSessionsTable.agentId, agentId))
            .catch(() => {});

          if (isLoggedOut) {
            // Remove saved credentials so next connect shows a fresh QR
            const authDir2 = path.join(SESSIONS_DIR, String(agentId));
            try { fs.rmSync(authDir2, { recursive: true, force: true }); } catch {}
            this.sessions.delete(agentId);
            return;
          }

          // Exponential backoff: 5s → 7.5s → 11s → … max 30s (24/7 operation)
          const attempts = reconnectAttempts + 1;
          const delay = Math.min(5_000 * Math.pow(1.5, Math.min(attempts - 1, 5)), 30_000);
          logger.info({ agentId, delay, attempts }, "Scheduling WhatsApp reconnect");

          setTimeout(() => {
            const s = this.sessions.get(agentId);
            if (!s || s.status === "disconnected") {
              this.sessions.delete(agentId);
              const state2: SessionState = { status: "disconnected", reconnectAttempts: attempts };
              this.sessions.set(agentId, state2);
              this.connect(agentId).catch(() => {});
            }
          }, delay);
        }

        if (connection === "open") {
          const phone = (sock.user?.id ?? "").split(":")[0] || null;
          sessionState.status = "connected";
          sessionState.phoneNumber = phone ?? undefined;
          sessionState.qr = undefined;
          sessionState.reconnectAttempts = 0;
          this.sessions.set(agentId, { ...sessionState });

          await db
            .update(whatsappSessionsTable)
            .set({ status: "connected", qrCode: null, phoneNumber: phone, updatedAt: new Date() })
            .where(eq(whatsappSessionsTable.agentId, agentId))
            .catch(() => {});

          logger.info({ agentId, phone }, "WhatsApp connected successfully");
        }
      });

      // ── Incoming messages ──────────────────────────────────────────────
      sock.ev.on("messages.upsert", async ({ messages, type }: any) => {
        // "notify" = new real messages. "append" = history/status updates → ignore
        if (type !== "notify") return;

        for (const msg of messages) {
          try {
            await this.handleIncomingMessage(agentId, sock, msg);
          } catch (err) {
            logger.error({ err, agentId }, "Error handling incoming WhatsApp message");
          }
        }
      });

    } catch (err) {
      logger.error({ err, agentId }, "WhatsApp connect() threw an error");
      this.sessions.set(agentId, { status: "disconnected", reconnectAttempts });
      await db
        .update(whatsappSessionsTable)
        .set({ status: "disconnected", qrCode: null, updatedAt: new Date() })
        .where(eq(whatsappSessionsTable.agentId, agentId))
        .catch(() => {});
    }
  }

  // ─── Handle a single incoming message ───────────────────────────────────
  private async handleIncomingMessage(agentId: number, sock: any, msg: any) {
    if (msg.key.fromMe || !msg.message) return;

    const jid: string = msg.key.remoteJid ?? "";
    // Skip group messages and broadcast
    if (!jid || jid.endsWith("@g.us") || jid === "status@broadcast") return;

    // ── Extract text from common message types ──
    let text: string =
      msg.message.conversation ??
      msg.message.extendedTextMessage?.text ??
      msg.message.imageMessage?.caption ??
      msg.message.videoMessage?.caption ??
      msg.message.buttonsResponseMessage?.selectedDisplayText ??
      msg.message.listResponseMessage?.title ??
      msg.message.templateButtonReplyMessage?.selectedDisplayText ??
      "";

    let isAudio = false;

    // ── If no text, try to transcribe audio/PTT (voice note) ──
    if (!text.trim() && (msg.message.audioMessage || msg.message.pttMessage)) {
      isAudio = true;
      const transcribed = await this.transcribeAudio(agentId, sock, msg);
      if (transcribed) {
        text = transcribed;
      } else {
        // Could not transcribe — send a helpful fallback
        try {
          await sock.sendMessage(jid, {
            text: "Desculpe, não consegui transcrever o áudio. Por favor, envie sua mensagem em texto. 🙏"
          });
        } catch {}
        return;
      }
    }

    if (!text.trim()) return;

    const contactPhone = jid.replace("@s.whatsapp.net", "");
    const contactName: string = msg.pushName ?? contactPhone;

    // Load session row
    const [session] = await db
      .select()
      .from(whatsappSessionsTable)
      .where(eq(whatsappSessionsTable.agentId, agentId))
      .limit(1);
    if (!session) return;

    // Load agent (with responseDelaySecs)
    const [agentRow] = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.id, agentId))
      .limit(1);
    if (!agentRow) return;

    // ── Get or create conversation ──
    let [conv] = await db
      .select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.contactPhone, contactPhone),
          eq(conversationsTable.sessionId, session.id)
        )
      )
      .limit(1);

    const isNew = !conv;

    if (!conv) {
      [conv] = await db
        .insert(conversationsTable)
        .values({ sessionId: session.id, contactPhone, contactName, lastMessage: text, lastMessageAt: new Date() })
        .returning();
    } else {
      await db
        .update(conversationsTable)
        .set({ lastMessage: text, lastMessageAt: new Date(), contactName })
        .where(eq(conversationsTable.id, conv.id));
    }

    // ── Save user message ──
    await db.insert(messagesTable).values({
      conversationId: conv.id,
      content: text,
      role: "user",
    });

    // ── SSE notification to dashboard ──
    const displayText = isAudio ? `🎵 ${text}` : text;
    sseEmit(agentRow.userId, {
      type: "new_message",
      conversationId: conv.id,
      contactName,
      contactPhone,
      text: displayText.length > 60 ? displayText.slice(0, 60) + "…" : displayText,
      isNew,
      agentId,
    });

    // ── Generate AI reply ──
    const aiReply = await this.generateReply(agentRow, conv.id);
    if (!aiReply) return;

    // ── Typing indicator + configurable delay ──
    const delaySecs = Math.max(1, Math.min(agentRow.responseDelaySecs ?? 3, 60));

    try { await sock.sendPresenceUpdate("composing", jid); } catch {}
    await new Promise(r => setTimeout(r, delaySecs * 1_000));
    try { await sock.sendPresenceUpdate("paused", jid); } catch {}

    // ── Send message ──
    try {
      await sock.sendMessage(jid, { text: aiReply });
    } catch (err) {
      logger.error({ err, agentId, jid }, "Failed to send WhatsApp message");
      return;
    }

    // ── Persist assistant reply ──
    await db.insert(messagesTable).values({
      conversationId: conv.id,
      content: aiReply,
      role: "assistant",
    });

    await db
      .update(conversationsTable)
      .set({ lastMessage: aiReply, lastMessageAt: new Date() })
      .where(eq(conversationsTable.id, conv.id));
  }

  // ─── Disconnect ──────────────────────────────────────────────────────────
  async disconnect(agentId: number) {
    const state = this.sessions.get(agentId);
    if (state?.sock) {
      try { await state.sock.logout(); } catch {}
      try { state.sock.end(undefined); } catch {}
    }
    this.sessions.set(agentId, { status: "disconnected", reconnectAttempts: 0 });
    await db
      .update(whatsappSessionsTable)
      .set({ status: "disconnected", qrCode: null, updatedAt: new Date() })
      .where(eq(whatsappSessionsTable.agentId, agentId));

    // Remove credentials so next connect asks for fresh QR
    const authDir = path.join(SESSIONS_DIR, String(agentId));
    try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {}
  }

  // ─── Transcribe audio message with OpenAI Whisper ────────────────────────
  private async transcribeAudio(agentId: number, sock: any, msg: any): Promise<string | null> {
    try {
      // Get API key for this agent's user
      const [agentRow] = await db
        .select({ userId: agentsTable.userId })
        .from(agentsTable)
        .where(eq(agentsTable.id, agentId))
        .limit(1);
      if (!agentRow) return null;

      const [userRow] = await db
        .select({ openaiApiKey: usersTable.openaiApiKey })
        .from(usersTable)
        .where(eq(usersTable.id, agentRow.userId))
        .limit(1);

      const apiKey = userRow?.openaiApiKey?.trim() || process.env["OPENAI_API_KEY"];
      if (!apiKey) {
        logger.warn({ agentId }, "No OpenAI key — cannot transcribe audio");
        return null;
      }

      // Download audio buffer from WhatsApp CDN
      const { downloadMediaMessage } = await import("@whiskeysockets/baileys") as any;
      const audioBuffer: Buffer = await downloadMediaMessage(
        msg,
        "buffer",
        {},
        { logger: { level: "silent", info() {}, warn() {}, error() {}, debug() {}, trace() {}, fatal() {}, child() { return this; } }, reuploadRequest: sock.updateMediaMessage }
      );

      if (!audioBuffer || audioBuffer.length === 0) {
        logger.warn({ agentId }, "Empty audio buffer received");
        return null;
      }

      // WhatsApp sends PTT/audio as OGG/OPUS — Whisper supports OGG
      const { default: OpenAI, toFile } = await import("openai");
      const client = new OpenAI({ apiKey });

      const audioFile = await toFile(audioBuffer, "audio.ogg", { type: "audio/ogg" });

      const transcription = await client.audio.transcriptions.create({
        model: "whisper-1",
        file: audioFile,
        language: "pt", // Portuguese — change if multilingual agents are needed
      });

      const text = transcription.text?.trim();
      if (!text) return null;

      logger.info({ agentId, chars: text.length }, "Audio transcribed via Whisper");
      return text;
    } catch (err) {
      logger.error({ err, agentId }, "Audio transcription failed");
      return null;
    }
  }

  // ─── Generate AI reply ──────────────────────────────────────────────────
  private async generateReply(agent: typeof agentsTable.$inferSelect, convId: number): Promise<string | null> {
    try {
      // Get API key (user's key has priority over env)
      const [userRow] = await db
        .select({ openaiApiKey: usersTable.openaiApiKey })
        .from(usersTable)
        .where(eq(usersTable.id, agent.userId))
        .limit(1);

      const apiKey = userRow?.openaiApiKey?.trim() || process.env["OPENAI_API_KEY"];
      if (!apiKey) {
        logger.warn({ agentId: agent.id }, "No OpenAI API key — cannot generate reply. Set it in Configurações.");
        return null;
      }

      // Knowledge base
      const knowledge = await db
        .select({ title: knowledgeTable.title, content: knowledgeTable.content })
        .from(knowledgeTable)
        .where(eq(knowledgeTable.agentId, agent.id));

      const knowledgeText = knowledge
        .map(k => `### ${k.title}\n${k.content}`)
        .join("\n\n");

      // Conversation history — ordered by createdAt (user message already inserted)
      const history = await db
        .select({ role: messagesTable.role, content: messagesTable.content, createdAt: messagesTable.createdAt })
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, convId))
        .orderBy(messagesTable.createdAt);

      // Keep last 20 turns (user + assistant pairs)
      const last20 = history.slice(-20);

      const baseInstructions = agent.instructions?.trim()
        || `Você é ${agent.name}, um assistente virtual inteligente. Responda sempre em português, de forma clara e útil.`;

      const systemPrompt = knowledgeText
        ? `${baseInstructions}\n\n## Base de Conhecimento\nUse as informações abaixo para responder às perguntas dos usuários. Priorize estas informações.\n\n${knowledgeText}`
        : baseInstructions;

      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey });

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...last20.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          // NOTE: user message is already in last20 (saved before this call)
          // Do NOT append it again here — that would duplicate it.
        ],
        max_tokens: 600,
        temperature: 0.75,
      });

      const reply = completion.choices[0]?.message?.content?.trim();
      if (!reply) return null;

      logger.info({ agentId: agent.id, convId, replyLen: reply.length }, "AI reply generated");
      return reply;
    } catch (err) {
      logger.error({ err, agentId: agent.id }, "generateReply error");
      return null;
    }
  }
}

export const waManager = new WhatsAppManager();
