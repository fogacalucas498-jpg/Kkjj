import { useEffect, useState } from "react";
import { Link } from "wouter";
import { agentsApi, type Agent } from "../../lib/api";

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const load = () => agentsApi.list().then(setAgents).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await agentsApi.create({ name: newName, description: newDesc });
      setCreating(false); setNewName(""); setNewDesc("");
      load();
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deletar este agente?")) return;
    await agentsApi.delete(id);
    setAgents(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>🤖 Agentes</h1>
          <p style={{ color: "#9992b8", fontSize: 14 }}>Crie e gerencie seus agentes de I.A para WhatsApp</p>
        </div>
        <button onClick={() => setCreating(true)} style={{
          padding: "11px 24px", background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
          border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer"
        }}>+ Novo Agente</button>
      </div>

      {/* Create modal */}
      {creating && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "#080810", border: "1px solid rgba(139,92,246,0.12)", borderRadius: 20, padding: 36, width: 460 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Criar novo agente</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Nome do agente *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Assistente de Vendas" required style={inputStyle} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Descrição (opcional)</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Ex: Atende clientes sobre produtos" style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={() => setCreating(false)} style={{ flex: 1, padding: "11px", background: "transparent", border: "1px solid rgba(139,92,246,0.12)", borderRadius: 8, color: "#9992b8", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: "11px", background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Criar Agente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9992b8" }}>Carregando agentes...</div>
      ) : agents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🤖</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Nenhum agente criado</h2>
          <p style={{ color: "#9992b8", marginBottom: 24 }}>Crie seu primeiro agente para começar a atender clientes no WhatsApp</p>
          <button onClick={() => setCreating(true)} style={{ padding: "12px 28px", background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Criar meu primeiro agente
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {agents.map(a => (
            <div key={a.id} style={{
              background: "#080810", border: "1px solid rgba(139,92,246,0.10)",
              borderRadius: 16, padding: 24, transition: "border-color 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 22,
                }}>🤖</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link href={`/app/agents/${a.id}`}>
                    <button style={{ padding: "6px 14px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 6, color: "#8b5cf6", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Editar</button>
                  </Link>
                  <button onClick={() => handleDelete(a.id)} style={{ padding: "6px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Excluir</button>
                </div>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{a.name}</h3>
              <p style={{ fontSize: 13, color: "#9992b8", marginBottom: 16 }}>{a.description || "Sem descrição"}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{
                  padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700,
                  background: a.whatsapp?.status === "connected" ? "rgba(139,92,246,0.15)" :
                    a.whatsapp?.status === "qr" ? "rgba(251,191,36,0.15)" : "rgba(139,92,246,0.07)",
                  color: a.whatsapp?.status === "connected" ? "#8b5cf6" :
                    a.whatsapp?.status === "qr" ? "#fbbf24" : "#9992b8",
                }}>
                  {a.whatsapp?.status === "connected" ? "● WhatsApp conectado" :
                    a.whatsapp?.status === "qr" ? "⟳ Aguardando QR" : "○ Desconectado"}
                </span>
                {a.whatsapp?.status === "connected" && a.whatsapp.phoneNumber && (
                  <span style={{ fontSize: 12, color: "#9992b8" }}>+{a.whatsapp.phoneNumber}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#9992b8", marginBottom: 6 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", background: "#0e0e1a", border: "1px solid rgba(139,92,246,0.12)",
  borderRadius: 8, color: "#ffffff", fontSize: 14, outline: "none", boxSizing: "border-box",
};
