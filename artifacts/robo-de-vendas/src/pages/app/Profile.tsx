import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/auth";
import { authApi } from "../../lib/api";
import { Icon } from "../../components/Icon";

type Section = "info" | "password" | "ai";

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [section, setSection] = useState<Section>("info");

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [infoPassword, setInfoPassword] = useState("");
  const [infoStatus, setInfoStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [infoError, setInfoError] = useState("");

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdStatus, setPwdStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pwdError, setPwdError] = useState("");
  const [showPwds, setShowPwds] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    authApi.getSettings().then(s => {
      setHasKey(s.hasOpenaiKey);
      setMemberSince(s.memberSince);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  const handleInfoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoError(""); setInfoStatus("saving");
    const emailChanged = email.toLowerCase() !== user?.email?.toLowerCase();
    if (emailChanged && !infoPassword) {
      setInfoError("Informe sua senha atual para alterar o email."); setInfoStatus("error"); return;
    }
    try {
      const payload: Parameters<typeof authApi.updateProfile>[0] = {};
      if (name.trim() !== user?.name) payload.name = name.trim();
      if (emailChanged) { payload.email = email.trim(); payload.currentPassword = infoPassword; }
      if (!payload.name && !payload.email) { setInfoStatus("idle"); return; }
      const updated = await authApi.updateProfile(payload);
      updateUser({ name: updated.name, email: updated.email });
      setInfoPassword("");
      setInfoStatus("saved");
      setTimeout(() => setInfoStatus("idle"), 3000);
    } catch (err: any) {
      setInfoError(err?.response?.data?.error ?? "Erro ao salvar. Tente novamente.");
      setInfoStatus("error");
    }
  };

  const handlePwdSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(""); setPwdStatus("saving");
    if (newPwd !== confirmPwd) { setPwdError("As senhas não coincidem."); setPwdStatus("error"); return; }
    if (newPwd.length < 6) { setPwdError("A nova senha deve ter no mínimo 6 caracteres."); setPwdStatus("error"); return; }
    try {
      await authApi.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      setPwdStatus("saved");
      setTimeout(() => setPwdStatus("idle"), 3000);
    } catch (err: any) {
      setPwdError(err?.response?.data?.error ?? "Erro ao alterar a senha.");
      setPwdStatus("error");
    }
  };

  const handleKeySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyStatus("saving");
    try {
      await authApi.updateProfile({ openaiApiKey: apiKey || undefined });
      setHasKey(!!apiKey);
      setApiKey("");
      setKeyStatus("saved");
      setTimeout(() => setKeyStatus("idle"), 3000);
    } catch { setKeyStatus("error"); }
  };

  const handleRemoveKey = async () => {
    if (!confirm("Remover a chave OpenAI? Os agentes perderão as respostas automáticas com IA.")) return;
    try {
      await authApi.updateProfile({ openaiApiKey: "" });
      setHasKey(false);
      setKeyStatus("saved");
      setTimeout(() => setKeyStatus("idle"), 3000);
    } catch { setKeyStatus("error"); }
  };

  const tabs: { id: Section; label: string; iconName: "user" | "lock" | "robot" }[] = [
    { id: "info",     label: "Dados Pessoais", iconName: "user" },
    { id: "password", label: "Senha",          iconName: "lock" },
    { id: "ai",       label: "IA & API",       iconName: "robot" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="user" size={22} color="#8b5cf6" /> Meu Perfil
        </h1>
        <p style={{ color: "#9992b8", fontSize: 14 }}>Gerencie seus dados pessoais e configurações da conta</p>
      </div>

      {/* Avatar card */}
      <div style={{ background: "#080810", border: "1px solid rgba(139,92,246,0.12)", borderRadius: 20, padding: 28, marginBottom: 24, display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, fontWeight: 900, color: "#fff", flexShrink: 0,
          boxShadow: "0 0 24px rgba(139,92,246,0.35)",
        }}>
          {getInitials(user?.name ?? "U")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{user?.name}</div>
          <div style={{ fontSize: 14, color: "#9992b8", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
          {memberSince && (
            <div style={{ fontSize: 12, color: "#9992b8" }}>
              Membro desde {new Date(memberSince).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </div>
          )}
        </div>
        <div style={{ padding: "6px 16px", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 100, fontSize: 12, fontWeight: 700, color: "#8b5cf6", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="star" size={11} color="#8b5cf6" /> Plano Grátis
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#080810", padding: 6, borderRadius: 14, width: "fit-content", border: "1px solid rgba(139,92,246,0.10)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSection(t.id)} style={{
            padding: "9px 22px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
            background: section === t.id ? "linear-gradient(135deg, #8b5cf6, #7c3aed)" : "transparent",
            color: section === t.id ? "#fff" : "#9992b8",
            boxShadow: section === t.id ? "0 2px 12px rgba(139,92,246,0.3)" : "none",
            transition: "all 0.15s", display: "flex", alignItems: "center", gap: 7,
          }}>
            <Icon name={t.iconName} size={13} color={section === t.id ? "#fff" : "#9992b8"} />
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 560 }}>
        {/* ── Dados Pessoais ── */}
        {section === "info" && (
          <Card>
            <h2 style={cardTitle}>Dados Pessoais</h2>
            <form onSubmit={handleInfoSave}>
              <Field label="Nome completo">
                <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Seu nome" required />
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="seu@email.com" required />
              </Field>
              {email.toLowerCase() !== (user?.email ?? "").toLowerCase() && (
                <Field label="Senha atual (necessária para alterar o email)">
                  <input type="password" value={infoPassword} onChange={e => setInfoPassword(e.target.value)} style={inputStyle} placeholder="Confirme sua senha" />
                </Field>
              )}
              <StatusBanner status={infoStatus} error={infoError} savedMsg="Dados atualizados com sucesso!" />
              <button type="submit" disabled={infoStatus === "saving"} style={{ ...btnPrimary, opacity: infoStatus === "saving" ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                {infoStatus === "saving" ? <><Icon name="spinner" size={13} spin /> Salvando...</> : "Salvar alterações"}
              </button>
            </form>
          </Card>
        )}

        {/* ── Senha ── */}
        {section === "password" && (
          <Card>
            <h2 style={cardTitle}>Alterar Senha</h2>
            <form onSubmit={handlePwdSave}>
              <Field label="Senha atual">
                <div style={{ position: "relative" }}>
                  <input type={showPwds ? "text" : "password"} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} style={{ ...inputStyle, paddingRight: 44 }} placeholder="Sua senha atual" required />
                  <EyeBtn show={showPwds} toggle={() => setShowPwds(v => !v)} />
                </div>
              </Field>
              <Field label="Nova senha">
                <div style={{ position: "relative" }}>
                  <input type={showPwds ? "text" : "password"} value={newPwd} onChange={e => setNewPwd(e.target.value)} style={{ ...inputStyle, paddingRight: 44 }} placeholder="Mínimo 6 caracteres" required minLength={6} />
                  <EyeBtn show={showPwds} toggle={() => setShowPwds(v => !v)} />
                </div>
              </Field>
              <Field label="Confirmar nova senha">
                <div style={{ position: "relative" }}>
                  <input type={showPwds ? "text" : "password"} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} style={{ ...inputStyle, paddingRight: 44 }} placeholder="Repita a nova senha" required />
                  <EyeBtn show={showPwds} toggle={() => setShowPwds(v => !v)} />
                </div>
                {newPwd && confirmPwd && newPwd !== confirmPwd && (
                  <p style={{ fontSize: 12, color: "#f87171", marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
                    <Icon name="triangle-exclamation" size={11} color="#f87171" /> As senhas não coincidem
                  </p>
                )}
              </Field>
              <StatusBanner status={pwdStatus} error={pwdError} savedMsg="Senha alterada com sucesso!" />
              <button type="submit" disabled={pwdStatus === "saving" || !currentPwd || !newPwd || !confirmPwd}
                style={{ ...btnPrimary, opacity: (pwdStatus === "saving" || !currentPwd || !newPwd || !confirmPwd) ? 0.6 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                {pwdStatus === "saving" ? <><Icon name="spinner" size={13} spin /> Alterando...</> : "Alterar senha"}
              </button>
            </form>
          </Card>
        )}

        {/* ── IA & API ── */}
        {section === "ai" && (
          <Card>
            <h2 style={cardTitle}>Inteligência Artificial</h2>
            <p style={{ color: "#9992b8", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Configure sua chave OpenAI para que os agentes respondam automaticamente com IA no WhatsApp.
            </p>

            {hasKey && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, marginBottom: 24 }}>
                <Icon name="circle-check" size={20} color="#a78bfa" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Chave OpenAI configurada</div>
                  <div style={{ fontSize: 12, color: "#9992b8" }}>Seus agentes estão com IA ativada</div>
                </div>
                <button onClick={handleRemoveKey} style={{ padding: "6px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Remover
                </button>
              </div>
            )}

            <form onSubmit={handleKeySave}>
              <Field label={hasKey ? "Atualizar chave API OpenAI (sk-...)" : "Chave API OpenAI (sk-...)"}>
                <div style={{ position: "relative" }}>
                  <input type={showApiKey ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ ...inputStyle, paddingRight: 44 }} placeholder="sk-proj-..." />
                  <EyeBtn show={showApiKey} toggle={() => setShowApiKey(v => !v)} />
                </div>
                <p style={{ fontSize: 12, color: "#9992b8", marginTop: 6 }}>
                  Obtenha em{" "}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: "#8b5cf6" }}>platform.openai.com/api-keys</a>.
                  A chave é salva com segurança no servidor.
                </p>
              </Field>
              <StatusBanner status={keyStatus} error="" savedMsg={hasKey ? "Chave atualizada com sucesso!" : "Chave salva com sucesso!"} />
              <button type="submit" disabled={keyStatus === "saving" || !apiKey.trim()}
                style={{ ...btnPrimary, opacity: (!apiKey.trim() || keyStatus === "saving") ? 0.6 : 1, cursor: apiKey.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 8 }}>
                {keyStatus === "saving" ? <><Icon name="spinner" size={13} spin /> Salvando...</> : hasKey ? "Atualizar chave" : "Salvar chave"}
              </button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#080810", border: "1px solid rgba(139,92,246,0.12)", borderRadius: 18, padding: 32 }}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#9992b8", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function EyeBtn({ show, toggle }: { show: boolean; toggle: () => void }) {
  return (
    <button type="button" onClick={toggle} style={{
      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
      background: "none", border: "none", color: "#9992b8", cursor: "pointer",
      display: "flex", alignItems: "center",
    }}>
      <Icon name={show ? "eye-slash" : "eye"} size={16} color="#9992b8" />
    </button>
  );
}

function StatusBanner({ status, error, savedMsg }: { status: string; error: string; savedMsg: string }) {
  if (status === "saved") return (
    <div style={{ padding: "10px 14px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8, color: "#a78bfa", fontSize: 14, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
      <Icon name="circle-check" size={13} color="#a78bfa" /> {savedMsg}
    </div>
  );
  if (status === "error" && error) return (
    <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#fca5a5", fontSize: 14, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
      <Icon name="triangle-exclamation" size={13} color="#fca5a5" /> {error}
    </div>
  );
  return null;
}

const cardTitle: React.CSSProperties = { fontSize: 17, fontWeight: 800, marginBottom: 24 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", background: "#0e0e1a",
  border: "1px solid rgba(139,92,246,0.15)", borderRadius: 8, color: "#ffffff",
  fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'Manrope', sans-serif",
  transition: "border-color 0.15s",
};
const btnPrimary: React.CSSProperties = {
  padding: "11px 28px", background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
  border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
};
