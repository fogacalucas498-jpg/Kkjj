const BASE = import.meta.env.BASE_URL;

function navigate(path: string) {
  window.location.href = BASE.endsWith("/") ? `${BASE}${path.replace(/^\//, "")}` : `${BASE}${path}`;
}

export default function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Sem cartão de crédito
        </div>

        <h1>
          Transforme o Atendimento,<br />
          <span>Encante com I.A no WhatsApp</span>
        </h1>

        <p className="hero-sub">
          Com o Robô de Vendas - Networking VIP, levar o atendimento inteligente
          do seu negócio ao WhatsApp nunca foi tão fácil e eficiente.
        </p>

        <div className="hero-actions">
          <button className="btn-primary btn-large" onClick={() => navigate("/register")}>Cadastre-se Agora</button>
          <button className="btn-ghost btn-large" onClick={() => navigate("/register")}>Entrar na Lista</button>
        </div>

        <p className="hero-note">✓ Sem cartão de crédito &nbsp;·&nbsp; ✓ Grátis para sempre &nbsp;·&nbsp; ✓ Comece em minutos</p>

        <div className="hero-img-wrap">
          <img
            src={`${BASE}images/dashboard1.png`}
            alt="Plataforma Robô de Vendas"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `${BASE}images/dashboard2.png`;
            }}
          />
        </div>
      </div>
    </section>
  );
}
