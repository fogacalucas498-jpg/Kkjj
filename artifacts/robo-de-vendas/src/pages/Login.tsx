import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "../contexts/auth";

const BASE = import.meta.env.BASE_URL;

export default function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
      navigate("/app");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Erro ao entrar. Tente novamente.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07090f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Manrope', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 24 }}>
              <img src={`${BASE}images/logo.jpg`} alt="logo" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(37,211,102,0.5)" }} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#25d366" }}>Robô de Vendas</div>
                <div style={{ fontSize: 12, color: "#8b98b4" }}>Networking VIP</div>
              </div>
            </div>
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 8 }}>Entrar na plataforma</h1>
          <p style={{ color: "#8b98b4", fontSize: 14 }}>Acesse sua conta para gerenciar seus agentes</p>
        </div>

        <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 32 }}>
          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, color: "#fca5a5", fontSize: 14 }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
          <p style={{ textAlign: "center", marginTop: 20, color: "#8b98b4", fontSize: 14 }}>
            Não tem conta?{" "}
            <Link href="/register"><span style={{ color: "#25d366", fontWeight: 700, cursor: "pointer" }}>Cadastre-se grátis</span></Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#8b98b4", marginBottom: 6 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, color: "#f0f4ff", fontSize: 14, outline: "none", boxSizing: "border-box",
};
const btnStyle: React.CSSProperties = {
  width: "100%", padding: "13px", background: "linear-gradient(135deg, #25d366, #16a34a)",
  border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
};
