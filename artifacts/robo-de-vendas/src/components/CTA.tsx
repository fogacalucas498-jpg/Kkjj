const BASE = import.meta.env.BASE_URL;

function navigate(path: string) {
  window.location.href = BASE.endsWith("/") ? `${BASE}${path.replace(/^\//, "")}` : `${BASE}${path}`;
}

export default function CTA() {
  return (
    <section className="cta-section">
      <div className="container">
        <div className="cta-card">
          <h2>
            Transforme seu WhatsApp<br />
            <span>com I.A!</span>
          </h2>
          <p>
            Vamos transformar experiências, juntos! Comece agora mesmo a testar o
            Robô de Vendas - Networking VIP, sem precisar de cartão de crédito.
            É 100% gratuito.
          </p>
          <button className="btn-primary btn-large" onClick={() => navigate("/register")}>
            Começar Agora — É Grátis
          </button>
        </div>
      </div>
    </section>
  );
}
