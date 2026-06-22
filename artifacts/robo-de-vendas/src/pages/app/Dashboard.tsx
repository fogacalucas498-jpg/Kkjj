import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "../../contexts/auth";
import { agentsApi, conversationsApi, type Agent, type Conversation } from "../../lib/api";

export default function Dashboard() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      agentsApi.list().then(setAgents),
      conversationsApi.list().then(setConversations).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const connectedAgents = agents.filter(a => a.whatsapp?.status === "connected");
  const totalMessages = conversations.length;

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Olá, {user?.name?.split(" ")[0]}! 👋</h1>
        <p style={{ color: "#9992b8", fontSize: 15 }}>Bem-vindo ao painel de controle do seu Robô de Vendas.</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 }}>
        {[
          { label: "Agentes criados", value: agents.length, icon: "🤖", color: "#8b5cf6" },
          { label: "Conectados", value: connectedAgents.length, icon: "📱", color: "#3b82f6" },
          { label: "Conversas", value: totalMessages, icon: "💬", color: "#a855f7" },
          { label: "Plano", value: "GRÁTIS", icon: "✨", color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} style={{
            padding: 24, borderRadius: 16, background: "#080810",
            border: "1px solid rgba(139,92,246,0.10)"
          }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#9992b8", fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Agents */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={{ background: "#080810", border: "1px solid rgba(139,92,246,0.10)", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800 }}>Seus Agentes</h2>
            <Link href="/app/agents">
              <span style={{ fontSize: 13, color: "#8b5cf6", fontWeight: 700, cursor: "pointer" }}>Ver todos →</span>
            </Link>
          </div>
          {loading ? <div style={{ color: "#9992b8", fontSize: 14 }}>Carregando...</div> :
            agents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
                <p style={{ color: "#9992b8", fontSize: 14, marginBottom: 16 }}>Nenhum agente criado ainda</p>
                <Link href="/app/agents">
                  <button style={{ padding: "9px 20px", background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    + Criar Agente
                  </button>
                </Link>
              </div>
            ) : agents.slice(0, 4).map(a => (
              <Link key={a.id} href={`/app/agents/${a.id}`}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 0", borderBottom: "1px solid rgba(139,92,246,0.07)", cursor: "pointer"
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: "#9992b8" }}>{a.description || "Sem descrição"}</div>
                  </div>
                  <span style={{
                    padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700,
                    background: a.whatsapp?.status === "connected" ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.07)",
                    color: a.whatsapp?.status === "connected" ? "#8b5cf6" : "#9992b8",
                  }}>
                    {a.whatsapp?.status === "connected" ? "● Conectado" : "○ Desconectado"}
                  </span>
                </div>
              </Link>
            ))
          }
        </div>

        <div style={{ background: "#080810", border: "1px solid rgba(139,92,246,0.10)", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800 }}>Conversas Recentes</h2>
            <Link href="/app/conversations">
              <span style={{ fontSize: 13, color: "#8b5cf6", fontWeight: 700, cursor: "pointer" }}>Ver todas →</span>
            </Link>
          </div>
          {conversations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
              <p style={{ color: "#9992b8", fontSize: 14 }}>Nenhuma conversa ainda.<br />Conecte um agente ao WhatsApp!</p>
            </div>
          ) : conversations.slice(0, 5).map(c => (
            <Link key={c.id} href={`/app/conversations/${c.id}`}>
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 0", borderBottom: "1px solid rgba(139,92,246,0.07)", cursor: "pointer"
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", background: "rgba(139,92,246,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0
                }}>👤</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.contactName || c.contactPhone}</div>
                  <div style={{ fontSize: 12, color: "#9992b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMessage || "..."}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick start */}
      {agents.length === 0 && (
        <div style={{ marginTop: 24, padding: 28, borderRadius: 16, background: "linear-gradient(135deg, rgba(139,92,246,0.08), transparent)", border: "1px solid rgba(139,92,246,0.2)" }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>🚀 Comece em 3 passos</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { step: "1", text: "Crie seu primeiro agente", link: "/app/agents" },
              { step: "2", text: "Adicione sua base de conhecimento", link: "/app/agents" },
              { step: "3", text: "Conecte ao WhatsApp via QR Code", link: "/app/agents" },
            ].map(s => (
              <Link key={s.step} href={s.link}>
                <div style={{ padding: 16, borderRadius: 12, background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.08)", cursor: "pointer" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(139,92,246,0.2)", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, marginBottom: 10 }}>{s.step}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.text}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
