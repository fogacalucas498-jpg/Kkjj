import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { agentsApi, whatsappApi, type Agent } from "../../lib/api";

interface Props { id: string }

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AgentDetail({ id }: Props) {
  const agentId = Number(id);
  const [, navigate] = useLocation();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [tab, setTab] = useState<"info" | "knowledge" | "whatsapp">("info");
  const [whatsappStatus, setWhatsappStatus] = useState<{
    status: string; qr: string | null; phoneNumber: string | null;
  }>({ status: "disconnected", qr: null, phoneNumber: null });
  const [connecting, setConnecting] = useState(false);
  const [newKTitle, setNewKTitle] = useState("");
  const [newKContent, setNewKContent] = useState("");
  const [addingK, setAddingK] = useState(false);
  const [kError, setKError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showMsg = (type: "success" | "error", text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 4000);
  };

  const load = () =>
    agentsApi.get(agentId)
      .then(a => setAgent(a))
      .catch(() => navigate("/app/agents"))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [agentId]);

  useEffect(() => {
    if (tab !== "whatsapp") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    const poll = () => whatsappApi.status(agentId).then(setWhatsappStatus).catch(() => {});
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [tab, agentId]);

  const handleSave = async () => {
    if (!agent) return;
    if (!agent.name.trim()) { setSaveStatus("error"); return; }
    setSaving(true); setSaveStatus("idle");
    try {
      await agentsApi.update(agentId, {
        name: agent.name.trim(),
        description: agent.description,
        instructions: agent.instructions,
        responseDelaySecs: agent.responseDelaySecs,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await agentsApi.export(agentId);
      const slug = (agent?.name ?? "agente").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      downloadJson(`${slug}-agente.json`, data);
      showMsg("success", "Agente exportado com sucesso!");
    } catch {
      showMsg("error", "Erro ao exportar agente.");
    } finally {
      setExporting(false);
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const copy = await agentsApi.duplicate(agentId);
      navigate(`/app/agents/${copy.id}`);
    } catch {
      showMsg("error", "Erro ao duplicar agente.");
      setDuplicating(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try { await whatsappApi.connect(agentId); } catch {}
    setTimeout(() => setConnecting(false), 1500);
  };

  const handleDisconnect = async () => {
    await whatsappApi.disconnect(agentId);
    setWhatsappStatus({ status: "disconnected", qr: null, phoneNumber: null });
  };

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKTitle.trim() || !newKContent.trim()) { setKError("Preencha o título e o conteúdo."); return; }
    setKError("");
    try {
      const k = await agentsApi.addKnowledge(agentId, { title: newKTitle.trim(), content: newKContent.trim() });
      setAgent(prev => prev ? { ...prev, knowledge: [...(prev.knowledge ?? []), k] } : prev);
      setNewKTitle(""); setNewKContent(""); setAddingK(false);
    } catch {
      setKError("Erro ao salvar. Tente novamente.");
    }
  };

  const handleDeleteKnowledge = async (kid: number) => {
    if (!confirm("Excluir este documento?")) return;
    await agentsApi.deleteKnowledge(agentId, kid);
    setAgent(prev => prev ? { ...prev, knowledge: prev.knowledge?.filter(k => k.id !== kid) } : prev);
  };

  if (loading) return <div style={{ color: "#9992b8", padding: 40, textAlign: "center" }}>Carregando...</div>;
  if (!agent) return <div style={{ color: "#f87171", padding: 40 }}>Agente não encontrado</div>;

  const delaySecs: number = agent.responseDelaySecs ?? 3;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => navigate("/app/agents")} style={{
            background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
            borderRadius: 8, color: "#9992b8", fontSize: 18, cursor: "pointer",
            width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>←</button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{agent.name}</h1>
            <p style={{ color: "#9992b8", fontSize: 14 }}>{agent.description || "Sem descrição"}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ActionBtn icon="📤" label={exporting ? "Exportando..." : "Exportar JSON"} disabled={exporting} onClick={handleExport} />
          <ActionBtn icon="📋" label={duplicating ? "Duplicando..." : "Duplicar"} disabled={duplicating} onClick={handleDuplicate} />
        </div>
      </div>

      {/* ── Feedback banner ── */}
      {actionMsg && (
        <div style={{
          padding: "10px 16px", borderRadius: 10, fontSize: 13, marginBottom: 20,
          background: actionMsg.type === "success" ? "rgba(139,92,246,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${actionMsg.type === "success" ? "rgba(139,92,246,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: actionMsg.type === "success" ? "#a78bfa" : "#fca5a5",
        }}>
          {actionMsg.type === "success" ? "✓ " : "⚠️ "}{actionMsg.text}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 28, background: "#080810",
        padding: 6, borderRadius: 12, width: "fit-content", flexWrap: "wrap",
        border: "1px solid rgba(139,92,246,0.10)",
      }}>
        {([
          ["info", "📝 Informações"],
          ["knowledge", "📚 Conhecimento"],
          ["whatsapp", "📱 WhatsApp"],
        ] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13,
            fontWeight: 700, cursor: "pointer",
            background: tab === t ? "linear-gradient(135deg,#8b5cf6,#7c3aed)" : "transparent",
            color: tab === t ? "#ffffff" : "#9992b8",
            boxShadow: tab === t ? "0 2px 8px rgba(139,92,246,0.3)" : "none",
            transition: "all 0.15s",
          }}>{l}</button>
        ))}
      </div>

      {/* ═══ INFO TAB ═══ */}
      {tab === "info" && (
        <div style={{ maxWidth: 620 }}>
          <Card>
            <Field label="Nome do Agente *">
              <input value={agent.name}
                onChange={e => setAgent({ ...agent, name: e.target.value })}
                style={inputStyle} placeholder="Nome do agente" />
            </Field>

            <Field label="Descrição">
              <input value={agent.description}
                onChange={e => setAgent({ ...agent, description: e.target.value })}
                placeholder="Para que serve este agente?" style={inputStyle} />
            </Field>

            <Field label="Instruções do Agente">
              <p style={{ fontSize: 12, color: "#9992b8", marginBottom: 8, lineHeight: 1.5 }}>
                Defina como o agente deve se comportar, tom de voz e limitações.
              </p>
              <textarea
                value={agent.instructions}
                onChange={e => setAgent({ ...agent, instructions: e.target.value })}
                placeholder="Ex: Você é um assistente de vendas da loja X. Atenda os clientes com simpatia, fale sempre em português, e quando não souber a resposta, peça para o cliente aguardar."
                rows={8}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
            </Field>

            {/* ── Typing delay ── */}
            <Field label="⏱️ Delay de Digitação (segundos)">
              <p style={{ fontSize: 12, color: "#9992b8", marginBottom: 12, lineHeight: 1.5 }}>
                Tempo que o robô ficará com <strong style={{ color: "#a78bfa" }}>digitando...</strong> antes de enviar a resposta. Deixa mais natural.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <input
                  type="range" min={1} max={30} step={1}
                  value={delaySecs}
                  onChange={e => setAgent({ ...agent, responseDelaySecs: Number(e.target.value) } as any)}
                  style={{ flex: 1, accentColor: "#8b5cf6", cursor: "pointer" }}
                />
                <div style={{
                  minWidth: 52, padding: "5px 12px", textAlign: "center",
                  background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)",
                  borderRadius: 8, fontSize: 15, fontWeight: 800, color: "#a78bfa",
                }}>
                  {delaySecs}s
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9992b8", marginTop: 4 }}>
                <span>1s (rápido)</span>
                <span>30s (lento)</span>
              </div>

              {/* Visual preview */}
              <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.10)", fontSize: 13 }}>
                <span style={{ color: "#9992b8" }}>Preview: </span>
                <span style={{ color: "#a78bfa" }}>digitando por {delaySecs} segundo{delaySecs !== 1 ? "s" : ""}</span>
                <span style={{ color: "#9992b8" }}> → envia resposta</span>
              </div>
            </Field>

            {/* Save status */}
            {saveStatus === "saved" && (
              <div style={{ padding: "10px 14px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8, color: "#a78bfa", fontSize: 14, marginBottom: 16 }}>
                ✓ Alterações salvas com sucesso!
              </div>
            )}
            {saveStatus === "error" && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#fca5a5", fontSize: 14, marginBottom: 16 }}>
                {!agent.name.trim() ? "O nome do agente é obrigatório." : "Erro ao salvar. Tente novamente."}
              </div>
            )}

            <button onClick={handleSave} disabled={saving}
              style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Salvando..." : "💾 Salvar alterações"}
            </button>
          </Card>
        </div>
      )}

      {/* ═══ KNOWLEDGE TAB ═══ */}
      {tab === "knowledge" && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <p style={{ color: "#9992b8", fontSize: 14 }}>
              Adicione documentos, FAQs e textos para treinar seu agente.
            </p>
            <button onClick={() => { setAddingK(true); setKError(""); }} style={btnPrimary}>
              + Adicionar
            </button>
          </div>

          {addingK && (
            <Card style={{ marginBottom: 20 }}>
              <form onSubmit={handleAddKnowledge}>
                <Field label="Título *">
                  <input autoFocus value={newKTitle} onChange={e => setNewKTitle(e.target.value)}
                    placeholder="Ex: Política de Devolução" style={inputStyle} />
                </Field>
                <Field label="Conteúdo *">
                  <textarea value={newKContent} onChange={e => setNewKContent(e.target.value)}
                    placeholder="Cole o texto, FAQ, ou informações que o agente deve conhecer..."
                    rows={6} style={{ ...inputStyle, resize: "vertical" }} />
                </Field>
                {kError && <p style={{ color: "#fca5a5", fontSize: 13, marginBottom: 12 }}>⚠️ {kError}</p>}
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => { setAddingK(false); setKError(""); }} style={btnGhost}>Cancelar</button>
                  <button type="submit" style={btnPrimary}>Salvar documento</button>
                </div>
              </form>
            </Card>
          )}

          {(agent.knowledge ?? []).length === 0 && !addingK ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
              <p style={{ color: "#9992b8", marginBottom: 20 }}>Nenhum documento adicionado ainda</p>
              <button onClick={() => setAddingK(true)} style={btnPrimary}>+ Adicionar primeiro documento</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(agent.knowledge ?? []).map(k => (
                <Card key={k.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{k.title}</h3>
                      <p style={{ fontSize: 13, color: "#9992b8", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {k.content.slice(0, 300)}{k.content.length > 300 ? "..." : ""}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteKnowledge(k.id)} style={{
                      marginLeft: 16, padding: "5px 12px",
                      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: 6, color: "#f87171", fontSize: 12, cursor: "pointer", flexShrink: 0,
                    }}>Excluir</button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ WHATSAPP TAB ═══ */}
      {tab === "whatsapp" && (
        <div style={{ maxWidth: 520 }}>
          <Card>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>📱 Conectar WhatsApp</h2>
            <p style={{ color: "#9992b8", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Conecte um número de WhatsApp a este agente. Ao receber mensagens, o agente responderá automaticamente com I.A e ficará
              {" "}<strong style={{ color: "#a78bfa" }}>digitando por {delaySecs}s</strong> antes de enviar.
            </p>

            {/* Status indicator */}
            <div style={{ marginBottom: 24, padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                  background:
                    whatsappStatus.status === "connected" ? "#8b5cf6" :
                    whatsappStatus.status === "qr" || whatsappStatus.status === "connecting" ? "#fbbf24" : "#4b5563",
                  boxShadow: whatsappStatus.status === "connected" ? "0 0 8px rgba(139,92,246,0.6)" : "none",
                  animation: whatsappStatus.status === "connecting" ? "statusPulse 1s ease-in-out infinite" : "none",
                }} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  {whatsappStatus.status === "connected"
                    ? `✅ Conectado — +${whatsappStatus.phoneNumber}`
                    : whatsappStatus.status === "qr"
                    ? "📱 Escaneie o QR Code abaixo"
                    : whatsappStatus.status === "connecting"
                    ? "⟳ Conectando ao WhatsApp..."
                    : "○ Desconectado"}
                </span>
              </div>
            </div>

            {/* QR Code */}
            {whatsappStatus.status === "qr" && whatsappStatus.qr && (
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 13, color: "#9992b8", marginBottom: 16, lineHeight: 1.6 }}>
                  <strong>No seu celular:</strong><br />
                  WhatsApp → Menu (⋮) → Dispositivos Conectados → Conectar um Dispositivo<br />
                  <span style={{ color: "#fbbf24", fontSize: 12 }}>iOS: Configurações → Dispositivos Vinculados → Vincular um Dispositivo</span>
                </div>
                <div style={{
                  display: "inline-block", padding: 16, background: "#ffffff",
                  borderRadius: 18, boxShadow: "0 0 50px rgba(139,92,246,0.3)",
                }}>
                  <img src={whatsappStatus.qr} alt="QR Code WhatsApp" style={{ width: 240, height: 240, display: "block" }} />
                </div>
                <p style={{ color: "#fbbf24", fontSize: 12, marginTop: 14 }}>
                  ⟳ QR Code atualizado automaticamente a cada 60 segundos
                </p>
              </div>
            )}

            {/* Action button */}
            {whatsappStatus.status === "connected" ? (
              <button onClick={handleDisconnect} style={{ ...btnGhost, width: "100%" }}>
                Desconectar WhatsApp
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting || whatsappStatus.status === "connecting" || whatsappStatus.status === "qr"}
                style={{
                  ...btnPrimary, width: "100%",
                  opacity: (connecting || whatsappStatus.status === "connecting" || whatsappStatus.status === "qr") ? 0.7 : 1,
                }}>
                {connecting || whatsappStatus.status === "connecting"
                  ? "⟳ Conectando..."
                  : whatsappStatus.status === "qr"
                  ? "⟳ Aguardando escanear..."
                  : "📱 Conectar WhatsApp"}
              </button>
            )}

            {/* Tip */}
            <div style={{ marginTop: 20, padding: 14, borderRadius: 10, background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.1)" }}>
              <p style={{ fontSize: 13, color: "#9992b8", lineHeight: 1.7, margin: 0 }}>
                💡 Configure sua chave OpenAI em{" "}
                <strong style={{ color: "#8b5cf6" }}>Configurações</strong>{" "}
                para ativar as respostas com I.A.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function ActionBtn({ icon, label, disabled, onClick }: { icon: string; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "9px 18px", background: "rgba(139,92,246,0.08)",
      border: "1px solid rgba(139,92,246,0.22)", borderRadius: 9,
      color: "#a78bfa", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.7 : 1, transition: "all 0.15s",
      display: "flex", alignItems: "center", gap: 6,
    }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "rgba(139,92,246,0.14)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(139,92,246,0.08)"; }}
    >
      {icon} {label}
    </button>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#080810", border: "1px solid rgba(139,92,246,0.10)",
      borderRadius: 16, padding: 28, ...style,
    }}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#9992b8", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", background: "#0e0e1a",
  border: "1px solid rgba(139,92,246,0.12)", borderRadius: 8,
  color: "#ffffff", fontSize: 14, outline: "none", boxSizing: "border-box",
  fontFamily: "'Manrope', sans-serif",
};
const btnPrimary: React.CSSProperties = {
  padding: "11px 24px", background: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
  border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  padding: "11px 24px", background: "transparent",
  border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8,
  color: "#9992b8", fontSize: 14, fontWeight: 600, cursor: "pointer",
};
