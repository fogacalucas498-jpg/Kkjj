import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import {
  db,
  whatsappSessionsTable,
  conversationsTable,
  messagesTable,
  agentsTable,
  knowledgeTable,
  usersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";
import { sseEmit } from "./sse-bus";

// ─── Session persistence ─────────────────────────────────────────────────────
// /home/runner persists across container restarts; /tmp is wiped every restart.
const SESSIONS_DIR = path.join(process.env["HOME"] ?? "/home/runner", ".wa-sessions");
fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// ─── Language directive appended to every system prompt ─────────────────────
// Written in English so GPT follows it reliably regardless of base language.
const LANGUAGE_DIRECTIVE = `

CRITICAL RULE — LANGUAGE: Detect the language of the user's latest message and respond EXCLUSIVELY in that same language. Examples: user writes in English → respond in English; Spanish → Spanish; Portuguese → Portuguese; French → French. NEVER mix languages or ignore this rule.`;

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

  // ─── Startup: reconnect sessions that were connected before restart ──────
  async reconnectPersisted() {
    try {
      const rows = await db
        .select({ agentId: whatsappSessionsTable.agentId })
        .from(whatsappSessionsTable)
        .where(eq(whatsappSessionsTable.status, "connected"));

      for (const { agentId } of rows) {
        const credsPath = path.join(SESSIONS_DIR, String(agentId), "creds.json");
        if (fs.existsSync(credsPath)) {
          logger.info({ agentId }, "Auto-reconnecting persisted WhatsApp session");
          this.connect(agentId).catch(err =>
            logger.error({ err, agentId }, "Auto-reconnect failed")
          );
        } else {
          // No credentials on disk — mark as disconnected so user re-scans QR
          await db
            .update(whatsappSessionsTable)
            .set({ status: "disconnected", qrCode: null, updatedAt: new Date() })
            .where(eq(whatsappSessionsTable.agentId, agentId))
            .catch(() => {});
          logger.info({ agentId }, "Session marked disconnected — credentials not found on disk");
        }
      }
    } catch (err) {
      logger.error({ err }, "reconnectPersisted failed");
    }

    // ── Watchdog: every 3 min check for dropped sockets and reconnect ────
    setInterval(async () => {
      try {
        const rows = await db
          .select({ agentId: whatsappSessionsTable.agentId })
          .from(whatsappSessionsTable)
          .where(eq(whatsappSessionsTable.status, "connected"));

        for (const { agentId } of rows) {
          const state = this.sessions.get(agentId);
          if (!state || state.status === "disconnected") {
            const credsPath = path.join(SESSIONS_DIR, String(agentId), "creds.json");
            if (fs.existsSync(credsPath)) {
              logger.info({ agentId }, "Watchdog: reconnecting dropped session");
              this.sessions.delete(agentId);
              this.connect(agentId).catch(() => {});
            }
          }
        }
      } catch { /* ignore */ }
    }, 3 * 60 * 1_000);
  }

  // ─── Connect ─────────────────────────────────────────────────────────────
  async connect(agentId: number) {
    const existing = this.sessions.get(agentId);
    if (
      existing?.status === "connected" ||
      existing?.status === "connecting" ||
      existing?.status === "qr"
    ) return;

    const reconnectAttempts = existing?.reconnectAttempts ?? 0;
    const sessionState: SessionState = { status: "connecting", reconnectAttempts };
    this.sessions.set(agentId, sessionState);

    try {
      const baileys = (await import("@whiskeysockets/baileys")) as any;
      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = baileys;

      const authDir = path.join(SESSIONS_DIR, String(agentId));
      fs.mkdirSync(authDir, { recursive: true });

      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      const { version } = await fetchLatestBaileysVersion();

      // Browsers.ubuntu("Chrome") is the recommended fingerprint — works on iOS and Android
      const browserConfig =
        typeof Browsers?.ubuntu === "function" ? Browsers.ubuntu("Chrome") : ["Ubuntu", "Chrome", "20.0.04"];

      const silentLogger = {
        level: "silent",
        info() {}, warn() {}, error() {}, debug() {}, trace() {}, fatal() {},
        child() { return this; },
      };

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
        logger: silentLogger,
      });

      sessionState.sock = sock;
      this.sessions.set(agentId, sessionState);

      sock.ev.on("creds.update", saveCreds);

      // ── Connection lifecycle ───────────────────────────────────────────
      sock.ev.on("connection.update", async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const QRCode = ((await import("qrcode")) as any).default;
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
            logger.error({ err, agentId }, "QR code generation failed");
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
            // Clear credentials — next connect will show a fresh QR
            const authDir2 = path.join(SESSIONS_DIR, String(agentId));
            try { fs.rmSync(authDir2, { recursive: true, force: true }); } catch {}
            this.sessions.delete(agentId);
            logger.info({ agentId }, "Logged out — credentials cleared");
            return;
          }

          // Exponential backoff: 5s → 7.5s → 11s → 17s → 25s → 30s max
          // Use sessionState.reconnectAttempts (which resets to 0 on success)
          const curAttempts = sessionState.reconnectAttempts;
          const nextAttempts = curAttempts + 1;
          const delay = Math.min(5_000 * Math.pow(1.5, Math.min(curAttempts, 5)), 30_000);
          logger.info({ agentId, delay, nextAttempts }, "Scheduling WhatsApp reconnect");

          setTimeout(() => {
            const s = this.sessions.get(agentId);
            if (!s || s.status === "disconnected") {
              this.sessions.delete(agentId);
              // Seed reconnectAttempts so next connect grows the backoff
              this.sessions.set(agentId, { status: "disconnected", reconnectAttempts: nextAttempts });
              this.connect(agentId).catch(() => {});
            }
          }, delay);
        }

        if (connection === "open") {
          const phone = (sock.user?.id ?? "").split(":")[0] || null;
          sessionState.status = "connected";
          sessionState.phoneNumber = phone ?? undefined;
          sessionState.qr = undefined;
          sessionState.reconnectAttempts = 0; // reset on successful connection
          this.sessions.set(agentId, { ...sessionState });

          await db
            .update(whatsappSessionsTable)
            .set({ status: "connected", qrCode: null, phoneNumber: phone, updatedAt: new Date() })
            .where(eq(whatsappSessionsTable.agentId, agentId))
            .catch(() => {});

          logger.info({ agentId, phone }, "WhatsApp connected");
        }
      });

      // ── Incoming messages ─────────────────────────────────────────────
      sock.ev.on("messages.upsert", async ({ messages, type }: any) => {
        // "notify" = real new messages; "append" = history sync / status → skip
        if (type !== "notify") return;

        for (const msg of messages) {
          try {
            await this.handleIncomingMessage(agentId, sock, msg);
          } catch (err) {
            logger.error({ err, agentId }, "Error handling incoming message");
          }
        }
      });
    } catch (err) {
      logger.error({ err, agentId }, "connect() threw an unexpected error");
      sessionState.status = "disconnected";
      sessionState.sock = undefined;
      this.sessions.set(agentId, { ...sessionState });
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
    if (!jid || jid.endsWith("@g.us") || jid === "status@broadcast") return;

    // ── Resolve agent & API key first (needed for audio transcription too) ──
    const [agentRow] = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.id, agentId))
      .limit(1);
    if (!agentRow) return;

    const [userRow] = await db
      .select({ openaiApiKey: usersTable.openaiApiKey })
      .from(usersTable)
      .where(eq(usersTable.id, agentRow.userId))
      .limit(1);

    const apiKey = userRow?.openaiApiKey?.trim() || process.env["OPENAI_API_KEY"] || null;

    // ── Extract text from all common WhatsApp message types ──
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

    // ── Audio / PTT (voice note) → transcribe with Whisper ──
    if (!text.trim() && (msg.message.audioMessage || msg.message.pttMessage)) {
      isAudio = true;
      if (!apiKey) {
        logger.warn({ agentId }, "No OpenAI key — cannot transcribe audio");
        try {
          await sock.sendMessage(jid, {
            text: "Não foi possível transcrever o áudio (chave OpenAI não configurada). Por favor, envie sua mensagem em texto. 🙏",
          });
        } catch {}
        return;
      }

      const transcribed = await this.transcribeAudio(sock, msg, apiKey);
      if (transcribed) {
        text = transcribed;
      } else {
        try {
          await sock.sendMessage(jid, {
            text: "Não consegui transcrever o áudio. Por favor, envie sua mensagem em texto. 🙏",
          });
        } catch {}
        return;
      }
    }

    if (!text.trim()) return;

    const contactPhone = jid.replace("@s.whatsapp.net", "");
    const contactName: string = (msg.pushName as string | undefined) ?? contactPhone;

    // ── Session row ──
    const [session] = await db
      .select({ id: whatsappSessionsTable.id })
      .from(whatsappSessionsTable)
      .where(eq(whatsappSessionsTable.agentId, agentId))
      .limit(1);
    if (!session) return;

    // ── Get or create conversation ──
    let [conv] = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.contactPhone, contactPhone), eq(conversationsTable.sessionId, session.id)))
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

    // ── Persist user message ──
    await db.insert(messagesTable).values({ conversationId: conv.id, content: text, role: "user" });

    // ── SSE push to dashboard ──
    const preview = isAudio ? `🎵 ${text}` : text;
    sseEmit(agentRow.userId, {
      type: "new_message",
      conversationId: conv.id,
      contactName,
      contactPhone,
      text: preview.length > 60 ? preview.slice(0, 60) + "…" : preview,
      isNew,
      agentId,
    });

    // ── Generate AI reply ──
    if (!apiKey) {
      logger.warn({ agentId }, "No OpenAI key — skipping AI reply. Configure it in Configurações.");
      return;
    }

    const aiReply = await this.generateReply(agentRow, conv.id, apiKey);
    if (!aiReply) return;

    // ── Typing indicator + configurable delay ──
    const delaySecs = Math.max(1, Math.min(agentRow.responseDelaySecs ?? 3, 60));
    try { await sock.sendPresenceUpdate("composing", jid); } catch {}
    await new Promise<void>(r => setTimeout(r, delaySecs * 1_000));
    try { await sock.sendPresenceUpdate("paused", jid); } catch {}

    // ── Send WhatsApp message ──
    try {
      await sock.sendMessage(jid, { text: aiReply });
    } catch (err) {
      logger.error({ err, agentId, jid }, "Failed to send WhatsApp message");
      return;
    }

    // ── Persist assistant reply ──
    await db.insert(messagesTable).values({ conversationId: conv.id, content: aiReply, role: "assistant" });
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

    // Clear credentials so next connect shows fresh QR
    const authDir = path.join(SESSIONS_DIR, String(agentId));
    try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {}
  }

  // ─── Transcribe audio with OpenAI Whisper ───────────────────────────────
  // Whisper supports: mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
  // WhatsApp sends PTT and audio as OGG/OPUS — works natively.
  // No language param → Whisper auto-detects (enables multi-language).
  private async transcribeAudio(sock: any, msg: any, apiKey: string): Promise<string | null> {
    try {
      const { downloadMediaMessage } = (await import("@whiskeysockets/baileys")) as any;
      const silentLogger = {
        level: "silent",
        info() {}, warn() {}, error() {}, debug() {}, trace() {}, fatal() {},
        child() { return this; },
      };

      const audioBuffer: Buffer = await downloadMediaMessage(
        msg,
        "buffer",
        {},
        { logger: silentLogger, reuploadRequest: sock.updateMediaMessage }
      );

      if (!audioBuffer || audioBuffer.length === 0) {
        logger.warn("transcribeAudio: received empty buffer");
        return null;
      }

      const { default: OpenAI, toFile } = (await import("openai")) as any;
      const client = new OpenAI({ apiKey });

      // Do NOT specify language → Whisper auto-detects for multi-language support
      const audioFile = await toFile(audioBuffer, "audio.ogg", { type: "audio/ogg" });
      const transcription = await client.audio.transcriptions.create({
        model: "whisper-1",
        file: audioFile,
        // language: omitted intentionally — auto-detect
      });

      const text: string = transcription.text?.trim() ?? "";
      if (!text) return null;

      logger.info({ chars: text.length }, "Audio transcribed via Whisper");
      return text;
    } catch (err) {
      logger.error({ err }, "transcribeAudio failed");
      return null;
    }
  }

  // ─── Generate AI reply ──────────────────────────────────────────────────
  private async generateReply(
    agent: typeof agentsTable.$inferSelect,
    convId: number,
    apiKey: string,
  ): Promise<string | null> {
    try {
      // Knowledge base
      const knowledge = await db
        .select({ title: knowledgeTable.title, content: knowledgeTable.content })
        .from(knowledgeTable)
        .where(eq(knowledgeTable.agentId, agent.id));

      const knowledgeText = knowledge.map(k => `### ${k.title}\n${k.content}`).join("\n\n");

      // Conversation history — ordered chronologically; user message already saved
      const history = await db
        .select({ role: messagesTable.role, content: messagesTable.content })
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, convId))
        .orderBy(messagesTable.createdAt);

      // Use last 20 messages for context (10 user + 10 assistant turns)
      const last20 = history.slice(-20);

      // Base instructions: use agent's custom instructions or a neutral default
      const baseInstructions =
        agent.instructions?.trim() ||
        `Você é ${agent.name}, um assistente virtual inteligente e prestativo. Seja educado, claro e objetivo.`;

      // Build system prompt
      let systemPrompt = baseInstructions;
      if (knowledgeText) {
        systemPrompt += `\n\n## Base de Conhecimento\nUse as informações abaixo para responder. Priorize estas informações.\n\n${knowledgeText}`;
      }

      // ── Multi-language directive — always appended ──
      // GPT reliably follows this regardless of the rest of the prompt language.
      systemPrompt += LANGUAGE_DIRECTIVE;

      const { default: OpenAI } = (await import("openai")) as any;
      const client = new OpenAI({ apiKey });

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          // History already includes the latest user message (saved before this call)
          // Do NOT append userMessage again — that would duplicate it in the context.
          ...last20.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
        max_tokens: 600,
        temperature: 0.75,
      });

      const reply: string = completion.choices[0]?.message?.content?.trim() ?? "";
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
