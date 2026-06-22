import { useState } from "react";

export default function Settings() {
  const [apiKey, setApiKey] = useState(localStorage.getItem("openai_key") ?? "");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("openai_key", apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>⚙️ Configurações</h1>
        <p style={{ color: "#8b98b4", fontSize: 14 }}>Configurações da plataforma</p>
      </div>

      <div style={{ maxWidth: 560 }}>
        <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 32, marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>🤖 Inteligência Artificial</h2>
          <p style={{ color: "#8b98b4", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Configure sua chave da API OpenAI para que os agentes respondam automaticamente às mensagens do WhatsApp com I.A.
          </p>
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#8b98b4", marginBottom: 6 }}>Chave API OpenAI (sk-...)</label>
              <input
                type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder="sk-proj-..."
                style={{ width: "100%", padding: "11px 14px", background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f0f4ff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
              <p style={{ fontSize: 12, color: "#8b98b4", marginTop: 8 }}>
                Obtenha sua chave em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" style={{ color: "#25d366" }}>platform.openai.com</a>. Sem custo adicional para o plano gratuito desta plataforma.
              </p>
            </div>
            <button type="submit" style={{ padding: "11px 28px", background: saved ? "rgba(37,211,102,0.2)" : "linear-gradient(135deg, #25d366, #16a34a)", border: saved ? "1px solid rgba(37,211,102,0.4)" : "none", borderRadius: 8, color: saved ? "#25d366" : "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {saved ? "✓ Salvo!" : "Salvar chave"}
            </button>
          </form>
        </div>

        <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 32 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>💚 Plano atual: GRÁTIS</h2>
          <p style={{ color: "#8b98b4", fontSize: 14, lineHeight: 1.7 }}>
            Você está no plano gratuito com acesso a todas as funcionalidades do Robô de Vendas - Networking VIP.
            Crie agentes, conecte WhatsApp e atenda clientes sem pagar nada.
          </p>
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {["Agentes ilimitados", "Conexão WhatsApp", "Respostas com I.A", "Base de conhecimento", "Histórico de conversas"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#c5cde0" }}>
                <span style={{ color: "#25d366" }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
