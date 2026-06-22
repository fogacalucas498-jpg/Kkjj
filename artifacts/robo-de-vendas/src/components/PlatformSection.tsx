const BASE = import.meta.env.BASE_URL;

const cards = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L3 7v11h5v-5h4v5h5V7L10 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Impulsione Satisfação e Fidelidade!",
    desc: "Impulsione a eficiência do seu time com agentes de I.A atendendo seus clientes diretamente no WhatsApp. Tire dúvidas e execute pré-vendas sem dores de cabeça.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M6 8h8M6 11h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    title: "Controle Que Reflete Excelência",
    desc: "Crie robôs e utilize de instruções, documentos, perguntas frequentes e mais para criar um agente altamente personalizado.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Embarque Conhecimento de Forma Simples",
    desc: "Conecte seus números do WhatsApp com agentes através de dispositivos diretamente pelo seu celular, totalmente em Cloud, sem instalar nada!",
  },
];

export default function PlatformSection() {
  return (
    <section className="section">
      <div className="container">
        <div className="platform-grid">
          <div>
            <div className="section-tag">✦ Plataforma</div>
            <h2 className="section-title">
              A Plataforma completa<br />
              <span>para agentes de I.A</span>
            </h2>
            <p className="section-sub">
              Converza é uma plataforma focada na construção de agentes de I.A
              que resolvem as dores do seu cliente e aumentam seus lucros.
            </p>

            <div className="platform-cards" style={{ marginTop: 40 }}>
              {cards.map((c) => (
                <div key={c.title} className="platform-card">
                  <div className="platform-card-icon">{c.icon}</div>
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="platform-img">
            <img src={`${BASE}images/dashboard2.png`} alt="Plataforma" />
          </div>
        </div>
      </div>
    </section>
  );
}
