import { useEffect, useState } from "react";
import { Link } from "wouter";
import { agentsApi, type Agent } from "../../lib/api";

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating2, setCreating2] = useState(false);

  const load = () => agentsApi.list().then(setAgents).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openModal = () => { setCreating(true); setCreateError(""); setNewName(""); setNewDesc(""); };
  const closeModal = () => { setCreating(false); setCreateError(""); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { setCreateError("O nome do agente é obrigatório."); return; }
    setCreating2(true);
    setCreateError("");
    try {
      await agentsApi.create({ name: newName.trim(), description: newDesc.trim() });
      closeModal();
      await load();
    } catch (err: any) {
      setCreateError(err?.response?.data?.error ?? "Erro ao criar agente. Tente novamente.");
    } finally {
      setCreating2(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Excluir o agente "${name}"? Esta ação remove também a sessão WhatsApp e todas as conversas.`)) return;
    try {
      await agentsApi.delete(id);
      setAgents(prev => prev.filter(a => a.id !== id));
    } catch {
      alert("Erro ao excluir agente. Tente novamente.");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>🤖 Agentes</h1>
          <p style={{ color: "#9992b8", fontSize: 14 }}>Crie e gerencie seus agentes de I.A para WhatsApp</p>
        </div>
        <button onClick={openModal} style={{
          padding: "11px 24px", background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
          border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer"
        }}>+ Novo Agente</button>
      </div>

      {creating && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)"
        }} onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={{ background: "#080810", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 20, padding: 36, width: 460, maxWidth: "calc(100vw - 32px)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Criar novo agente</h2>
            <p style={{ color: "#9992b8", fontSize: 14, marginBottom: 24 }}>Você poderá configurar instruções e conectar ao WhatsApp depois.</p>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Nome do agente *</label>
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Assistente de Vendas" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Descrição (opcional)</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Ex: Atende clientes sobre produtos" style={inputStyle} />
              </div>
              {createError && (
                <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#fca5a5", fontSize: 14, marginBottom: 16 }}>
                  ⚠️ {createError}
                </div>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={closeModal} style={{ flex: 1, padding: "11px", background: "transparent", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8, color: "#9992b8", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" disabled={creating2} style={{ flex: 1, padding: "11px", background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: creating2 ? 0.7 : 1 }}>
                  {creating2 ? "Criando..." : "Criar Agente"}
                </button>
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
          <button onClick={openModal} style={{ padding: "12px 28px", background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Criar meu primeiro agente
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {agents.map(a => (
            <div key={a.id} style={{
              background: "#080810", border: "1px solid rgba(139,92,246,0.10)",
              borderRadius: 16, padding: 24, transition: "border-color 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.10)")}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🤖</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link href={`/app/agents/${a.id}`}>
                    <button style={{ padding: "6px 14px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 6, color: "#8b5cf6", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Editar</button>
                  </Link>
                  <button onClick={() => handleDelete(a.id, a.name)} style={{ padding: "6px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Excluir</button>
                </div>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{a.name}</h3>
              <p style={{ fontSize: 13, color: "#9992b8", marginBottom: 16, lineHeight: 1.5 }}>{a.description || "Sem descrição"}</p>
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
