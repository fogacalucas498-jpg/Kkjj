import { Icon, type IconName } from "./Icon";

const BASE = import.meta.env.BASE_URL;

const cards: { iconName: IconName; title: string; desc: string }[] = [
  {
    iconName: "user-circle",
    title: "Impulsione Satisfação e Fidelidade!",
    desc: "Impulsione a eficiência do seu time com agentes de I.A atendendo seus clientes diretamente no WhatsApp. Tire dúvidas e execute pré-vendas sem dores de cabeça.",
  },
  {
    iconName: "comments",
    title: "Controle Que Reflete Excelência",
    desc: "Crie robôs e utilize de instruções, documentos, perguntas frequentes e mais para criar um agente altamente personalizado.",
  },
  {
    iconName: "lightbulb",
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
              Uma plataforma focada na construção de agentes de I.A
              que resolvem as dores do seu cliente e aumentam seus lucros.
            </p>

            <div className="platform-cards" style={{ marginTop: 40 }}>
              {cards.map((c) => (
                <div key={c.title} className="platform-card">
                  <div className="platform-card-icon">
                    <Icon name={c.iconName} size={20} color="#8b5cf6" />
                  </div>
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
