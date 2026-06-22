import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { conversationsApi, type Message } from "../../lib/api";

interface Props { id: string }

export default function ConversationDetail({ id }: Props) {
  const convId = Number(id);
  const [, navigate] = useLocation();
  const [data, setData] = useState<{ contactPhone: string; contactName?: string; messages: Message[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () => conversationsApi.get(convId).then(setData).finally(() => setLoading(false));
  useEffect(() => { load(); }, [convId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [data?.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    const msg = await conversationsApi.sendMessage(convId, reply);
    setData(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev);
    setReply("");
    setSending(false);
  };

  if (loading) return <div style={{ color: "#9992b8", padding: 40 }}>Carregando conversa...</div>;
  if (!data) return <div style={{ color: "#f87171", padding: 40 }}>Conversa não encontrada</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexShrink: 0 }}>
        <button onClick={() => navigate("/app/conversations")} style={{ background: "transparent", border: "none", color: "#9992b8", fontSize: 22, cursor: "pointer" }}>←</button>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>👤</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{data.contactName || data.contactPhone}</div>
          <div style={{ fontSize: 12, color: "#9992b8" }}>+{data.contactPhone}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflow: "auto", background: "#080810", borderRadius: 16,
        border: "1px solid rgba(139,92,246,0.10)", padding: 24, display: "flex", flexDirection: "column", gap: 12,
      }}>
        {data.messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#9992b8", fontSize: 14, marginTop: "auto" }}>Nenhuma mensagem ainda</div>
        )}
        {data.messages.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.role === "assistant" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "70%", padding: "10px 16px", borderRadius: m.role === "assistant" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: m.role === "assistant" ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.08)",
              border: `1px solid ${m.role === "assistant" ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.10)"}`,
            }}>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: "#ffffff" }}>{m.content}</p>
              <p style={{ fontSize: 11, color: "#9992b8", margin: "4px 0 0", textAlign: m.role === "assistant" ? "right" : "left" }}>
                {m.role === "assistant" ? "🤖 Agente" : "👤 Cliente"} · {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <form onSubmit={handleSend} style={{ display: "flex", gap: 12, marginTop: 16, flexShrink: 0 }}>
        <input
          value={reply} onChange={e => setReply(e.target.value)}
          placeholder="Enviar mensagem manual como agente..."
          style={{
            flex: 1, padding: "12px 16px", background: "#080810",
            border: "1px solid rgba(139,92,246,0.12)", borderRadius: 12,
            color: "#ffffff", fontSize: 14, outline: "none",
          }}
        />
        <button type="submit" disabled={sending || !reply.trim()} style={{
          padding: "12px 24px", background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
          border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>
          {sending ? "..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
