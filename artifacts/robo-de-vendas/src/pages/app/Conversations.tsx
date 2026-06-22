import { useEffect, useState } from "react";
import { Link } from "wouter";
import { conversationsApi, type Conversation } from "../../lib/api";

export default function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    conversationsApi.list().then(setConversations).finally(() => setLoading(false));
  }, []);

  const filtered = conversations.filter(c =>
    (c.contactName ?? c.contactPhone).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>💬 Conversas</h1>
        <p style={{ color: "#8b98b4", fontSize: 14 }}>Todas as conversas dos seus agentes no WhatsApp</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar por nome ou número..."
          style={{
            width: 340, padding: "10px 14px", background: "#0d1117",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
            color: "#f0f4ff", fontSize: 14, outline: "none"
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#8b98b4" }}>Carregando conversas...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>💬</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Nenhuma conversa ainda</h2>
          <p style={{ color: "#8b98b4", marginBottom: 8 }}>Conecte um agente ao WhatsApp para começar a receber mensagens</p>
          <Link href="/app/agents">
            <button style={{ marginTop: 16, padding: "11px 24px", background: "linear-gradient(135deg, #25d366, #16a34a)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Ir para Agentes
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
          {filtered.map((c, i) => (
            <Link key={c.id} href={`/app/conversations/${c.id}`}>
              <div style={{
                display: "flex", alignItems: "center", gap: 16, padding: "16px 24px",
                borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                cursor: "pointer", transition: "background 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "rgba(37,211,102,0.12)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 20, flexShrink: 0,
                }}>👤</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                    {c.contactName || c.contactPhone}
                  </div>
                  <div style={{ fontSize: 13, color: "#8b98b4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.lastMessage || "Nenhuma mensagem"}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: "#8b98b4" }}>
                    {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString("pt-BR") : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "#8b98b4", marginTop: 4 }}>+{c.contactPhone}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
