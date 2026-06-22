import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "../contexts/auth";

const BASE = import.meta.env.BASE_URL;

export default function Register() {
  const { register } = useAuth();
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await register(name, email, password);
      navigate("/app");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Erro ao cadastrar. Tente novamente.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Manrope', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 24 }}>
              <img src={`${BASE}images/logo.jpg`} alt="logo" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(139,92,246,0.5)" }} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#8b5cf6" }}>Robô de Vendas</div>
                <div style={{ fontSize: 12, color: "#9992b8" }}>Networking VIP</div>
              </div>
            </div>
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#ffffff", marginBottom: 8 }}>Criar conta grátis</h1>
          <p style={{ color: "#9992b8", fontSize: 14 }}>Comece a usar o Robô de Vendas hoje mesmo</p>
        </div>

        <div style={{ background: "#080810", border: "1px solid rgba(139,92,246,0.10)", borderRadius: 16, padding: 32 }}>
          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, color: "#fca5a5", fontSize: 14 }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Nome completo</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? "Criando conta..." : "Criar conta grátis"}
            </button>
          </form>
          <p style={{ textAlign: "center", marginTop: 20, color: "#9992b8", fontSize: 14 }}>
            Já tem conta?{" "}
            <Link href="/login"><span style={{ color: "#8b5cf6", fontWeight: 700, cursor: "pointer" }}>Entrar</span></Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#9992b8", marginBottom: 6 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", background: "#0e0e1a", border: "1px solid rgba(139,92,246,0.12)",
  borderRadius: 8, color: "#ffffff", fontSize: 14, outline: "none", boxSizing: "border-box",
};
const btnStyle: React.CSSProperties = {
  width: "100%", padding: "13px", background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
  border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
};
