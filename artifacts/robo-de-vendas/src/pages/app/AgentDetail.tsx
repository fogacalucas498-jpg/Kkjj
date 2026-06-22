import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { agentsApi, whatsappApi, type Agent, type Knowledge } from "../../lib/api";

interface Props { id: string }

export default function AgentDetail({ id }: Props) {
  const agentId = Number(id);
  const [, navigate] = useLocation();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"info" | "knowledge" | "whatsapp">("info");
  const [whatsappStatus, setWhatsappStatus] = useState<{ status: string; qr: string | null; phoneNumber: string | null }>({ status: "disconnected", qr: null, phoneNumber: null });
  const [connecting, setConnecting] = useState(false);
  const [newKTitle, setNewKTitle] = useState("");
  const [newKContent, setNewKContent] = useState("");
  const [addingK, setAddingK] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = () => agentsApi.get(agentId).then(a => { setAgent(a); }).finally(() => setLoading(false));
  useEffect(() => { load(); }, [agentId]);

  useEffect(() => {
    if (tab !== "whatsapp") { if (pollRef.current) clearInterval(pollRef.current); return; }
    const poll = () => whatsappApi.status(agentId).then(setWhatsappStatus).catch(() => {});
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [tab, agentId]);

  const handleSave = async () => {
    if (!agent) return;
    setSaving(true);
    await agentsApi.update(agentId, { name: agent.name, description: agent.description, instructions: agent.instructions });
    setSaving(false);
  };

  const handleConnect = async () => {
    setConnecting(true);
    await whatsappApi.connect(agentId);
    setTimeout(() => setConnecting(false), 2000);
  };

  const handleDisconnect = async () => {
    await whatsappApi.disconnect(agentId);
    setWhatsappStatus({ status: "disconnected", qr: null, phoneNumber: null });
  };

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKTitle || !newKContent) return;
    const k = await agentsApi.addKnowledge(agentId, { title: newKTitle, content: newKContent });
    setAgent(prev => prev ? { ...prev, knowledge: [...(prev.knowledge ?? []), k] } : prev);
    setNewKTitle(""); setNewKContent(""); setAddingK(false);
  };

  const handleDeleteKnowledge = async (kid: number) => {
    await agentsApi.deleteKnowledge(agentId, kid);
    setAgent(prev => prev ? { ...prev, knowledge: prev.knowledge?.filter(k => k.id !== kid) } : prev);
  };

  if (loading) return <div style={{ color: "#8b98b4", padding: 40 }}>Carregando...</div>;
  if (!agent) return <div style={{ color: "#f87171", padding: 40 }}>Agente não encontrado</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <button onClick={() => navigate("/app/agents")} style={{ background: "transparent", border: "none", color: "#8b98b4", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>←</button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{agent.name}</h1>
          <p style={{ color: "#8b98b4", fontSize: 14 }}>{agent.description || "Sem descrição"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "#0d1117", padding: 6, borderRadius: 12, width: "fit-content", border: "1px solid rgba(255,255,255,0.08)" }}>
        {([["info","📝 Informações"], ["knowledge","📚 Base de Conhecimento"], ["whatsapp","📱 WhatsApp"]] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
            background: tab === t ? "#111827" : "transparent",
            color: tab === t ? "#f0f4ff" : "#8b98b4",
            boxShadow: tab === t ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
          }}>{l}</button>
        ))}
      </div>

      {/* Info Tab */}
      {tab === "info" && (
        <div style={{ maxWidth: 600 }}>
          <Card>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Nome do Agente</label>
              <input value={agent.name} onChange={e => setAgent({ ...agent, name: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Descrição</label>
              <input value={agent.description} onChange={e => setAgent({ ...agent, description: e.target.value })} placeholder="Para que serve este agente?" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Instruções do Agente</label>
              <p style={{ fontSize: 12, color: "#8b98b4", marginBottom: 8 }}>Defina como o agente deve se comportar, qual o tom de voz, limitações, etc.</p>
              <textarea
                value={agent.instructions}
                onChange={e => setAgent({ ...agent, instructions: e.target.value })}
                placeholder="Ex: Você é um assistente de vendas da loja X. Atenda os clientes com simpatia, fale sempre em português, e quando não souber a resposta, peça para o cliente aguardar."
                rows={8}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
            </div>
            <button onClick={handleSave} disabled={saving} style={btnPrimary}>
              {saving ? "Salvando..." : "💾 Salvar alterações"}
            </button>
          </Card>
        </div>
      )}

      {/* Knowledge Tab */}
      {tab === "knowledge" && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <p style={{ color: "#8b98b4", fontSize: 14 }}>Adicione documentos, FAQs e textos para treinar seu agente.</p>
            <button onClick={() => setAddingK(true)} style={btnPrimary}>+ Adicionar</button>
          </div>

          {addingK && (
            <Card style={{ marginBottom: 20 }}>
              <form onSubmit={handleAddKnowledge}>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Título</label>
                  <input value={newKTitle} onChange={e => setNewKTitle(e.target.value)} placeholder="Ex: Política de Devolução" style={inputStyle} required />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Conteúdo</label>
                  <textarea value={newKContent} onChange={e => setNewKContent(e.target.value)} placeholder="Cole o texto, FAQ, ou informações que o agente deve conhecer..." rows={6} style={{ ...inputStyle, resize: "vertical" }} required />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => setAddingK(false)} style={btnGhost}>Cancelar</button>
                  <button type="submit" style={btnPrimary}>Salvar</button>
                </div>
              </form>
            </Card>
          )}

          {(agent.knowledge ?? []).length === 0 && !addingK ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
              <p style={{ color: "#8b98b4" }}>Nenhum documento adicionado ainda</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(agent.knowledge ?? []).map(k => (
                <Card key={k.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{k.title}</h3>
                      <p style={{ fontSize: 13, color: "#8b98b4", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{k.content.slice(0, 200)}{k.content.length > 200 ? "..." : ""}</p>
                    </div>
                    <button onClick={() => handleDeleteKnowledge(k.id)} style={{ marginLeft: 16, padding: "5px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: "#f87171", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Excluir</button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WhatsApp Tab */}
      {tab === "whatsapp" && (
        <div style={{ maxWidth: 500 }}>
          <Card>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>📱 Conectar WhatsApp</h2>
            <p style={{ color: "#8b98b4", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Conecte um número de WhatsApp a este agente. Ao receber mensagens, o agente responderá automaticamente com I.A.
            </p>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: whatsappStatus.status === "connected" ? "#25d366" :
                    whatsappStatus.status === "qr" || whatsappStatus.status === "connecting" ? "#fbbf24" : "#6b7280",
                  animation: whatsappStatus.status === "connecting" ? "pulse-dot 1s infinite" : "none"
                }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  {whatsappStatus.status === "connected" ? `Conectado: +${whatsappStatus.phoneNumber}` :
                    whatsappStatus.status === "qr" ? "Escaneie o QR Code abaixo" :
                    whatsappStatus.status === "connecting" ? "Conectando..." : "Desconectado"}
                </span>
              </div>
            </div>

            {whatsappStatus.status === "qr" && whatsappStatus.qr && (
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <p style={{ color: "#8b98b4", fontSize: 13, marginBottom: 16 }}>
                  Abra o WhatsApp no seu celular → Configurações → Dispositivos Conectados → Conectar Dispositivo
                </p>
                <div style={{ display: "inline-block", padding: 16, background: "#fff", borderRadius: 16, boxShadow: "0 0 40px rgba(37,211,102,0.2)" }}>
                  <img src={whatsappStatus.qr} alt="QR Code WhatsApp" style={{ width: 220, height: 220, display: "block" }} />
                </div>
                <p style={{ color: "#fbbf24", fontSize: 12, marginTop: 12 }}>⟳ QR Code atualizado automaticamente</p>
              </div>
            )}

            {whatsappStatus.status === "connected" ? (
              <button onClick={handleDisconnect} style={{ ...btnGhost, width: "100%" }}>Desconectar WhatsApp</button>
            ) : (
              <button onClick={handleConnect} disabled={connecting || whatsappStatus.status === "connecting"} style={{ ...btnPrimary, width: "100%" }}>
                {connecting || whatsappStatus.status === "connecting" ? "Conectando..." :
                  whatsappStatus.status === "qr" ? "⟳ Aguardando escanear..." : "📱 Conectar WhatsApp"}
              </button>
            )}

            <div style={{ marginTop: 24, padding: 16, borderRadius: 10, background: "rgba(37,211,102,0.05)", border: "1px solid rgba(37,211,102,0.1)" }}>
              <p style={{ fontSize: 13, color: "#8b98b4", lineHeight: 1.7 }}>
                ⚠️ <strong>Atenção:</strong> Para respostas automáticas com I.A, configure sua chave de API OpenAI nas configurações. Sem ela, o agente registrará as mensagens mas não responderá automaticamente.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 28, ...style }}>
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#8b98b4", marginBottom: 6 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, color: "#f0f4ff", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'Manrope', sans-serif"
};
const btnPrimary: React.CSSProperties = {
  padding: "11px 24px", background: "linear-gradient(135deg, #25d366, #16a34a)",
  border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer"
};
const btnGhost: React.CSSProperties = {
  padding: "11px 24px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, color: "#8b98b4", fontSize: 14, fontWeight: 600, cursor: "pointer"
};
