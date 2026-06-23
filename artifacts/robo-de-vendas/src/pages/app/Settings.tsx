import { useState, useEffect } from "react";
import { authApi } from "../../lib/api";
import { useAuth } from "../../contexts/auth";
import { Icon } from "../../components/Icon";

export default function Settings() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    authApi.getSettings().then(s => setHasKey(s.hasOpenaiKey)).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus("idle");
    try {
      await authApi.updateProfile({ openaiApiKey: apiKey || undefined });
      setHasKey(!!apiKey);
      setApiKey("");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!confirm("Remover a chave OpenAI? Os agentes não responderão automaticamente sem ela.")) return;
    try {
      await authApi.updateProfile({ openaiApiKey: "" });
      setHasKey(false);
      setApiKey("");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="gear" size={24} color="#8b5cf6" /> Configurações
        </h1>
        <p style={{ color: "#9992b8", fontSize: 14 }}>Configurações da plataforma</p>
      </div>

      <div style={{ maxWidth: 560 }}>
        {/* Account info */}
        <div style={{ background: "#080810", border: "1px solid rgba(139,92,246,0.10)", borderRadius: 16, padding: 32, marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="user" size={16} color="#a78bfa" /> Minha Conta
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Nome</label>
              <div style={valueStyle}>{user?.name}</div>
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <div style={valueStyle}>{user?.email}</div>
            </div>
          </div>
        </div>

        {/* OpenAI key */}
        <div style={{ background: "#080810", border: "1px solid rgba(139,92,246,0.10)", borderRadius: 16, padding: 32, marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="robot" size={16} color="#a78bfa" /> Inteligência Artificial
          </h2>
          <p style={{ color: "#9992b8", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            Configure sua chave da API OpenAI para que os agentes respondam automaticamente às mensagens do WhatsApp.
          </p>

          {hasKey && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, marginBottom: 20 }}>
              <Icon name="circle-check" size={20} color="#a78bfa" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Chave OpenAI configurada</div>
                <div style={{ fontSize: 12, color: "#9992b8" }}>Seus agentes estão com IA ativada</div>
              </div>
              <button onClick={handleRemoveKey} style={{ padding: "6px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Remover
              </button>
            </div>
          )}

          <form onSubmit={handleSave}>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>{hasKey ? "Atualizar chave API OpenAI" : "Chave API OpenAI (sk-...)"}</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  style={{ ...inputStyle, paddingRight: 48 }}
                />
                <button type="button" onClick={() => setShowKey(v => !v)} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "#9992b8", cursor: "pointer",
                  display: "flex", alignItems: "center",
                }}>
                  <Icon name={showKey ? "eye-slash" : "eye"} size={16} color="#9992b8" />
                </button>
              </div>
              <p style={{ fontSize: 12, color: "#9992b8", marginTop: 8 }}>
                Obtenha em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" style={{ color: "#8b5cf6" }}>platform.openai.com/api-keys</a>. A chave é salva com segurança no servidor.
              </p>
            </div>

            {status === "saved" && (
              <div style={{ padding: "10px 14px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8, color: "#a78bfa", fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="check" size={13} color="#a78bfa" /> Chave salva com sucesso!
              </div>
            )}
            {status === "error" && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#fca5a5", fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="triangle-exclamation" size={13} color="#fca5a5" /> Erro ao salvar. Tente novamente.
              </div>
            )}

            <button type="submit" disabled={saving || !apiKey.trim()} style={{
              padding: "11px 28px",
              background: (!apiKey.trim()) ? "rgba(139,92,246,0.2)" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
              border: "none", borderRadius: 8, color: (!apiKey.trim()) ? "#9992b8" : "#fff",
              fontSize: 14, fontWeight: 700, cursor: apiKey.trim() ? "pointer" : "not-allowed",
              opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8,
            }}>
              {saving ? <><Icon name="spinner" size={13} spin /> Salvando...</> : hasKey ? "Atualizar chave" : "Salvar chave"}
            </button>
          </form>
        </div>

        {/* Plan */}
        <div style={{ background: "#080810", border: "1px solid rgba(139,92,246,0.10)", borderRadius: 16, padding: 32 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="star" size={15} color="#a78bfa" /> Plano atual: GRÁTIS
          </h2>
          <p style={{ color: "#9992b8", fontSize: 14, lineHeight: 1.7 }}>
            Você está no plano gratuito com acesso completo à plataforma Robô de Vendas - Networking VIP.
          </p>
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {["Agentes ilimitados", "Conexão WhatsApp", "Respostas com I.A", "Base de conhecimento", "Histórico de conversas"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#d4cfed" }}>
                <Icon name="check" size={12} color="#8b5cf6" /> {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#9992b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" };
const valueStyle: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: "#ffffff" };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", background: "#0e0e1a", border: "1px solid rgba(139,92,246,0.12)",
  borderRadius: 8, color: "#ffffff", fontSize: 14, outline: "none", boxSizing: "border-box",
};
