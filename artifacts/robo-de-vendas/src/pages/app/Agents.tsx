import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { agentsApi, type Agent, type AgentExport } from "../../lib/api";

/* ── label / input shared styles ── */
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 600, color: "#9992b8", marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", background: "#0e0e1a",
  border: "1px solid rgba(139,92,246,0.15)", borderRadius: 8,
  color: "#ffffff", fontSize: 14, outline: "none", boxSizing: "border-box",
  fontFamily: "'Manrope', sans-serif",
};

/* ── Thin error/success banner ── */
function Banner({ type, children }: { type: "error" | "success"; children: React.ReactNode }) {
  const ok = type === "success";
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16,
      background: ok ? "rgba(139,92,246,0.08)" : "rgba(239,68,68,0.08)",
      border: `1px solid ${ok ? "rgba(139,92,246,0.3)" : "rgba(239,68,68,0.3)"}`,
      color: ok ? "#a78bfa" : "#fca5a5",
    }}>
      {ok ? "✓ " : "⚠️ "}{children}
    </div>
  );
}

/* ── Modal backdrop ── */
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(5px)",
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}

function ModalBox({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div style={{
      background: "#080810", border: "1px solid rgba(139,92,246,0.22)",
      borderRadius: 22, padding: 36, width: 520, maxWidth: "calc(100vw - 32px)",
      maxHeight: "90vh", overflowY: "auto",
      boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.05)",
    }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: subtitle ? 4 : 24 }}>{title}</h2>
      {subtitle && <p style={{ color: "#9992b8", fontSize: 14, marginBottom: 24 }}>{subtitle}</p>}
      {children}
    </div>
  );
}

/* ─────────────── IMPORT MODAL ─────────────── */
function parseAgentJson(raw: string): AgentExport | null {
  try {
    const obj = JSON.parse(raw);
    if (typeof obj !== "object" || obj === null) return null;
    if (!obj.name || typeof obj.name !== "string") return null;
    return obj as AgentExport;
  } catch {
    return null;
  }
}

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: (a: Agent) => void }) {
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<AgentExport | null>(null);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleRawChange = (val: string) => {
    setRaw(val);
    setParseError("");
    setImportError("");
    if (!val.trim()) { setPreview(null); return; }
    const parsed = parseAgentJson(val);
    if (!parsed) {
      setParseError("JSON inválido ou sem campo 'name'. Verifique o formato.");
      setPreview(null);
    } else {
      setPreview(parsed);
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".json")) {
      setParseError("Selecione um arquivo .json");
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setRaw(text);
      handleRawChange(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    setImportError("");
    try {
      const agent = await agentsApi.importAgent({
        name: preview.name,
        description: preview.description ?? "",
        instructions: preview.instructions ?? "",
        knowledge: preview.knowledge ?? [],
      });
      onImported(agent);
      onClose();
    } catch (err: any) {
      setImportError(err?.response?.data?.error ?? "Erro ao importar agente. Tente novamente.");
    } finally {
      setImporting(false);
    }
  };

  const tabBtn = (t: "paste" | "file", label: string) => (
    <button onClick={() => { setMode(t); setParseError(""); setImportError(""); setPreview(null); setRaw(""); }} style={{
      padding: "7px 18px", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: "pointer",
      background: mode === t ? "linear-gradient(135deg,#8b5cf6,#7c3aed)" : "transparent",
      color: mode === t ? "#fff" : "#9992b8", transition: "all 0.15s",
    }}>{label}</button>
  );

  return (
    <Modal onClose={onClose}>
      <ModalBox title="📥 Importar Agente" subtitle="Cole ou carregue um JSON exportado por este sistema.">
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#0e0e1a", padding: 5, borderRadius: 10, marginBottom: 24, width: "fit-content" }}>
          {tabBtn("paste", "📋 Colar JSON")}
          {tabBtn("file", "📂 Abrir Arquivo")}
        </div>

        {mode === "paste" ? (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Cole o JSON do agente *</label>
            <textarea
              autoFocus
              value={raw}
              onChange={e => handleRawChange(e.target.value)}
              placeholder={'{\n  "name": "Meu Agente",\n  "description": "...",\n  "instructions": "...",\n  "knowledge": []\n}'}
              rows={10}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "'Courier New', monospace", fontSize: 12, lineHeight: 1.6 }}
            />
          </div>
        ) : (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: "2px dashed rgba(139,92,246,0.3)", borderRadius: 12, padding: "40px 20px",
              textAlign: "center", cursor: "pointer", marginBottom: 16, transition: "all 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)")}
          >
            <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
              {raw ? "Arquivo carregado ✓" : "Arraste o .json aqui ou clique para selecionar"}
            </div>
            <div style={{ fontSize: 12, color: "#9992b8" }}>Apenas arquivos .json exportados por este sistema</div>
          </div>
        )}

        {/* Parse error */}
        {parseError && <Banner type="error">{parseError}</Banner>}

        {/* Preview */}
        {preview && !parseError && (
          <div style={{
            padding: 16, borderRadius: 12, background: "rgba(139,92,246,0.06)",
            border: "1px solid rgba(139,92,246,0.2)", marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, color: "#9992b8", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
              Preview do Agente
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, color: "#a78bfa" }}>{preview.name}</div>
            {preview.description && (
              <div style={{ fontSize: 13, color: "#9992b8", marginBottom: 8 }}>{preview.description}</div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {preview.instructions && (
                <span style={{ fontSize: 11, padding: "3px 10px", background: "rgba(139,92,246,0.12)", borderRadius: 100, color: "#a78bfa", fontWeight: 700 }}>
                  📝 Instruções configuradas
                </span>
              )}
              <span style={{ fontSize: 11, padding: "3px 10px", background: "rgba(139,92,246,0.12)", borderRadius: 100, color: "#a78bfa", fontWeight: 700 }}>
                📚 {preview.knowledge?.length ?? 0} documento{(preview.knowledge?.length ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}

        {/* Import error */}
        {importError && <Banner type="error">{importError}</Banner>}

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "11px", background: "transparent",
            border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8,
            color: "#9992b8", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Cancelar</button>
          <button onClick={handleImport}
            disabled={!preview || importing || !!parseError}
            style={{
              flex: 1, padding: "11px",
              background: !preview || !!parseError ? "rgba(139,92,246,0.2)" : "linear-gradient(135deg,#8b5cf6,#7c3aed)",
              border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700,
              cursor: !preview || !!parseError ? "not-allowed" : "pointer",
              opacity: importing ? 0.7 : 1,
            }}>
            {importing ? "Importando..." : "✅ Importar Agente"}
          </button>
        </div>
      </ModalBox>
    </Modal>
  );
}

/* ─────────────── CREATE MODAL ─────────────── */
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (a: Agent) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("O nome do agente é obrigatório."); return; }
    setSaving(true); setError("");
    try {
      const agent = await agentsApi.create({ name: name.trim(), description: desc.trim() });
      onCreated(agent);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Erro ao criar agente. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <ModalBox title="Criar novo agente" subtitle="Você poderá configurar instruções e conectar ao WhatsApp depois.">
        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nome do agente *</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Assistente de Vendas" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Descrição (opcional)</label>
            <input value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Ex: Atende clientes sobre produtos" style={inputStyle} />
          </div>
          {error && <Banner type="error">{error}</Banner>}
          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: "11px", background: "transparent",
              border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8,
              color: "#9992b8", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: "11px", background: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
              border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700,
              cursor: "pointer", opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Criando..." : "Criar Agente"}
            </button>
          </div>
        </form>
      </ModalBox>
    </Modal>
  );
}

/* ─────────────── MAIN PAGE ─────────────── */
export default function Agents() {
  const [, navigate] = useLocation();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = () => agentsApi.list().then(setAgents).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Excluir o agente "${name}"?\nEsta ação remove também a sessão WhatsApp e todas as conversas.`)) return;
    try {
      await agentsApi.delete(id);
      setAgents(prev => prev.filter(a => a.id !== id));
      showFeedback("success", `Agente "${name}" excluído com sucesso.`);
    } catch {
      showFeedback("error", "Erro ao excluir agente. Tente novamente.");
    }
  };

  const handleDuplicate = async (id: number, name: string) => {
    setDuplicatingId(id);
    try {
      const copy = await agentsApi.duplicate(id);
      setAgents(prev => [...prev, copy]);
      showFeedback("success", `"${name}" duplicado com sucesso!`);
    } catch {
      showFeedback("error", "Erro ao duplicar agente. Tente novamente.");
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleCreated = (agent: Agent) => {
    navigate(`/app/agents/${agent.id}`);
  };

  const handleImported = (agent: Agent) => {
    navigate(`/app/agents/${agent.id}`);
  };

  return (
    <div>
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={handleImported} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>🤖 Agentes</h1>
          <p style={{ color: "#9992b8", fontSize: 14 }}>Crie e gerencie seus agentes de I.A para WhatsApp</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setShowImport(true)} style={{
            padding: "11px 20px", background: "rgba(139,92,246,0.08)",
            border: "1px solid rgba(139,92,246,0.25)", borderRadius: 10,
            color: "#a78bfa", fontSize: 14, fontWeight: 700, cursor: "pointer",
            transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.14)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(139,92,246,0.08)"; }}
          >📥 Importar JSON</button>
          <button onClick={() => setShowCreate(true)} style={{
            padding: "11px 24px", background: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
            border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>+ Novo Agente</button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMsg && <Banner type={feedbackMsg.type}>{feedbackMsg.text}</Banner>}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9992b8" }}>Carregando agentes...</div>
      ) : agents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🤖</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Nenhum agente criado</h2>
          <p style={{ color: "#9992b8", marginBottom: 24 }}>Crie seu primeiro agente ou importe um existente via JSON</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => setShowCreate(true)} style={{
              padding: "12px 28px", background: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
              border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>Criar meu primeiro agente</button>
            <button onClick={() => setShowImport(true)} style={{
              padding: "12px 28px", background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.25)", borderRadius: 10,
              color: "#a78bfa", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>📥 Importar JSON</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 20 }}>
          {agents.map(a => (
            <AgentCard
              key={a.id} agent={a}
              duplicating={duplicatingId === a.id}
              onDelete={() => handleDelete(a.id, a.name)}
              onDuplicate={() => handleDuplicate(a.id, a.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── AGENT CARD ─────────────── */
function AgentCard({
  agent, duplicating, onDelete, onDuplicate,
}: {
  agent: Agent; duplicating: boolean;
  onDelete: () => void; onDuplicate: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const statusLabel =
    agent.whatsapp?.status === "connected" ? "● Conectado" :
    agent.whatsapp?.status === "qr" ? "⟳ Aguardando QR" : "○ Offline";
  const statusColor =
    agent.whatsapp?.status === "connected" ? "#8b5cf6" :
    agent.whatsapp?.status === "qr" ? "#fbbf24" : "#9992b8";

  return (
    <div style={{
      background: "#080810", border: "1px solid rgba(139,92,246,0.10)", borderRadius: 18,
      padding: 24, transition: "border-color 0.2s, box-shadow 0.2s", position: "relative",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(139,92,246,0.05)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.10)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
          🤖
        </div>
        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href={`/app/agents/${agent.id}`}>
            <button style={{
              padding: "6px 14px", background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.25)", borderRadius: 6,
              color: "#8b5cf6", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>Editar</button>
          </Link>
          {/* Context menu */}
          <div style={{ position: "relative" }} ref={menuRef}>
            <button onClick={() => setMenuOpen(v => !v)} style={{
              width: 32, height: 32, borderRadius: 6, background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)", color: "#9992b8", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}>⋯</button>
            {menuOpen && (
              <div style={{
                position: "absolute", right: 0, top: 38, zIndex: 100,
                background: "#0e0e1a", border: "1px solid rgba(139,92,246,0.18)", borderRadius: 12,
                minWidth: 180, boxShadow: "0 16px 48px rgba(0,0,0,0.6)", overflow: "hidden",
              }}>
                <MenuAction icon="📋" label="Duplicar" disabled={duplicating}
                  onClick={() => { setMenuOpen(false); onDuplicate(); }} />
                <div style={{ height: 1, background: "rgba(139,92,246,0.08)", margin: "4px 0" }} />
                <MenuAction icon="🗑️" label="Excluir" danger
                  onClick={() => { setMenuOpen(false); onDelete(); }} />
              </div>
            )}
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{agent.name}</h3>
      <p style={{ fontSize: 13, color: "#9992b8", marginBottom: 16, lineHeight: 1.5, minHeight: 40 }}>
        {agent.description || "Sem descrição"}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700,
          background: statusColor === "#8b5cf6" ? "rgba(139,92,246,0.15)" :
            statusColor === "#fbbf24" ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)",
          color: statusColor,
        }}>{statusLabel}</span>
        {agent.whatsapp?.phoneNumber && agent.whatsapp.status === "connected" && (
          <span style={{ fontSize: 11, color: "#9992b8" }}>+{agent.whatsapp.phoneNumber}</span>
        )}
      </div>

      {/* Duplicate overlay */}
      {duplicating && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: 18, background: "rgba(8,8,16,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8,
        }}>
          <div style={{ fontSize: 24 }}>📋</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa" }}>Duplicando...</div>
        </div>
      )}
    </div>
  );
}

function MenuAction({
  icon, label, danger = false, disabled = false, onClick,
}: {
  icon: string; label: string; danger?: boolean; disabled?: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "10px 14px", background: hovered
          ? (danger ? "rgba(239,68,68,0.08)" : "rgba(139,92,246,0.07)")
          : "transparent",
        border: "none", cursor: disabled ? "not-allowed" : "pointer", textAlign: "left",
        color: danger ? "#f87171" : "#fff", fontSize: 13, fontWeight: 600,
        fontFamily: "'Manrope', sans-serif", opacity: disabled ? 0.5 : 1,
        transition: "background 0.12s",
      }}>
      <span>{icon}</span> {label}
    </button>
  );
}
