import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { conversationsApi, type Message } from "../../lib/api";
import { Icon } from "../../components/Icon";

const BASE_URL = import.meta.env.BASE_URL;
const API_BASE = BASE_URL.endsWith("/") ? `${BASE_URL}api` : `${BASE_URL}/api`;

interface Props { id: string }

export default function ConversationDetail({ id }: Props) {
  const convId = Number(id);
  const [, navigate] = useLocation();
  const [data, setData] = useState<{ contactPhone: string; contactName?: string; messages: Message[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () =>
    conversationsApi.get(convId)
      .then(setData)
      .catch(() => navigate("/app/conversations"))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [convId]);

  /* ── Auto-scroll on new messages ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages?.length]);

  /* ── SSE: real-time updates for this conversation ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const url = `${API_BASE}/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === "new_message" && ev.conversationId === convId) {
          /* Show user message immediately */
          conversationsApi.get(convId).then(setData).catch(() => {});
          /* Fetch again after delay to capture AI reply */
          setTimeout(() => {
            conversationsApi.get(convId).then(setData).catch(() => {});
          }, 5000);
        }
      } catch {}
    };

    es.onerror = () => { es.close(); };
    return () => { es.close(); };
  }, [convId]);

  const doSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const msg = await conversationsApi.sendMessage(convId, reply.trim());
      setData(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev);
      setReply("");
    } catch {}
    setSending(false);
  };

  const handleSend = (e: React.FormEvent) => { e.preventDefault(); doSend(); };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  };

  if (loading) return (
    <div style={{ color: "#9992b8", padding: 40, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <Icon name="spinner" size={18} color="#8b5cf6" spin /> Carregando conversa...
    </div>
  );
  if (!data) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 96px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexShrink: 0 }}>
        <button onClick={() => navigate("/app/conversations")} style={{
          background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
          borderRadius: 8, color: "#9992b8", cursor: "pointer",
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="arrow-left" size={15} />
        </button>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="user" size={20} color="#a78bfa" />
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{data.contactName || data.contactPhone}</div>
          <div style={{ fontSize: 12, color: "#9992b8" }}>+{data.contactPhone}</div>
        </div>
        {/* Live indicator */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8b5cf6", background: "rgba(139,92,246,0.08)", padding: "4px 10px", borderRadius: 100, border: "1px solid rgba(139,92,246,0.15)" }}>
          <span className="dot-connected" style={{ width: 6, height: 6 }} />
          Ao vivo
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflow: "auto", background: "#080810", borderRadius: 16,
        border: "1px solid rgba(139,92,246,0.10)", padding: 24,
        display: "flex", flexDirection: "column", gap: 12, minHeight: 0,
      }}>
        {data.messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#9992b8", fontSize: 14, margin: "auto" }}>Nenhuma mensagem ainda</div>
        )}
        {data.messages.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.role === "assistant" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "72%", padding: "10px 16px",
              borderRadius: m.role === "assistant" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: m.role === "assistant" ? "rgba(139,92,246,0.18)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${m.role === "assistant" ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.08)"}`,
            }}>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: "#ffffff", wordBreak: "break-word" }}>{m.content}</p>
              <p style={{ fontSize: 11, color: "#9992b8", margin: "4px 0 0", textAlign: m.role === "assistant" ? "right" : "left", display: "flex", alignItems: "center", gap: 5, justifyContent: m.role === "assistant" ? "flex-end" : "flex-start" }}>
                {m.role === "assistant"
                  ? <><Icon name="robot" size={10} color="#9992b8" /> Agente</>
                  : <><Icon name="user" size={10} color="#9992b8" /> Cliente</>}
                {" · "}
                {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <form onSubmit={handleSend} style={{ display: "flex", gap: 12, marginTop: 16, flexShrink: 0 }}>
        <input
          value={reply} onChange={e => setReply(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Enviar mensagem manual como agente... (Enter para enviar)"
          style={{
            flex: 1, padding: "12px 16px", background: "#080810",
            border: "1px solid rgba(139,92,246,0.12)", borderRadius: 12,
            color: "#ffffff", fontSize: 14, outline: "none",
          }}
        />
        <button type="submit" disabled={sending || !reply.trim()} style={{
          padding: "12px 20px", borderRadius: 12, border: "none",
          background: reply.trim() ? "linear-gradient(135deg, #8b5cf6, #7c3aed)" : "rgba(139,92,246,0.2)",
          color: reply.trim() ? "#fff" : "#9992b8",
          cursor: reply.trim() ? "pointer" : "not-allowed",
          opacity: sending ? 0.7 : 1, transition: "all 0.2s",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {sending
            ? <Icon name="spinner" size={16} spin />
            : <Icon name="paper-plane" size={16} />}
        </button>
      </form>
    </div>
  );
}
