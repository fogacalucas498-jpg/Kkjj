const BASE = import.meta.env.BASE_URL;

function navigate(path: string) {
  window.location.href = BASE.endsWith("/") ? `${BASE}${path.replace(/^\//, "")}` : `${BASE}${path}`;
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const plans = [
  {
    name: "Start",
    desc: "Ideal para demandas menores",
    features: [
      "1.000 mensagens / mês",
      "1 dispositivo / número",
      "Bot completo",
      "Suporte Padrão",
      "Acesso gratuito",
    ],
    featured: false,
  },
  {
    name: "Pro",
    desc: "Ideal para demandas maiores",
    features: [
      "Mensagens ilimitadas",
      "Bot escuta áudios",
      "Múltiplos agentes",
      "Suporte Prioritário",
      "Acesso gratuito",
    ],
    featured: true,
  },
  {
    name: "Ultra",
    desc: "Para demandas muito grandes",
    features: [
      "2 dispositivos / números",
      "Escuta e envia áudios",
      "Suporte Premium",
      "Relatórios avançados",
      "Acesso gratuito",
    ],
    featured: false,
  },
];

export default function Pricing() {
  return (
    <section className="pricing-section" id="pricing">
      <div className="container">
        <div className="pricing-header">
          <div className="section-tag">✦ Preços</div>
          <h2 className="section-title">
            Comece Pequeno,<br />
            <span>Escale Muito</span>
          </h2>
          <p className="section-sub">
            Planos simples, sem taxas escondidas. Com o Robô de Vendas - Networking VIP,
            você já pode começar de forma automatizada com I.A no seu WhatsApp —
            <strong> tudo gratuito!</strong>
          </p>
        </div>

        <div className="pricing-cards">
          {plans.map((plan) => (
            <div key={plan.name} className={`pricing-card${plan.featured ? " featured" : ""}`}>
              <div className="pricing-plan">{plan.name}</div>
              <p className="pricing-desc">{plan.desc}</p>

              <div className="pricing-price">
                <span className="price-amount">GRÁTIS</span>
              </div>
              <div className="pricing-free-badge">100% Gratuito</div>

              <div className="pricing-divider" />

              <div className="pricing-features">
                {plan.features.map((f) => (
                  <div key={f} className="pricing-feature">
                    <div className="feature-check"><CheckIcon /></div>
                    {f}
                  </div>
                ))}
              </div>

              <button
                className={plan.featured ? "btn-plan btn-plan-primary" : "btn-plan btn-plan-ghost"}
                onClick={() => navigate("/register")}
              >
                Começar Agora
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
