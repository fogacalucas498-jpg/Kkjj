import { useState } from "react";
import { Icon, type IconName } from "./Icon";

const BASE = import.meta.env.BASE_URL;

const tabs: { label: string; iconName: IconName; title: string; desc: string; img: string }[] = [
  {
    label: "Construa",
    iconName: "robot",
    title: "Faça Uma Vez e Observe",
    desc: "Crie e treine um agente de I.A com o conhecimento do seu produto, defina regras e transfira para seus números. A I.A cuida do resto e faz a satisfação do seu cliente subir!",
    img: "dashboard3.png",
  },
  {
    label: "Resolva",
    iconName: "circle-check",
    title: "Resolva Automaticamente",
    desc: "Deixe a I.A resolver dúvidas, qualificar leads e executar pré-vendas automaticamente no WhatsApp, 24 horas por dia, 7 dias por semana, sem pausas.",
    img: "feature1.png",
  },
  {
    label: "Otimize",
    iconName: "chart-bar",
    title: "Otimize Continuamente",
    desc: "Analise relatórios precisos de atendimento, identifique gargalos e melhore o desempenho dos seus agentes com dados em tempo real.",
    img: "feature2.png",
  },
  {
    label: "Transfira",
    iconName: "arrow-right",
    title: "Transfira com Facilidade",
    desc: "Quando necessário, transfira o atendimento para um agente humano sem perder o contexto da conversa. Controle total, sempre.",
    img: "dashboard2.png",
  },
];

export default function Benefits() {
  const [active, setActive] = useState(0);
  const tab = tabs[active]!;

  return (
    <section className="benefits-section">
      <div className="container">
        <div className="section-tag">✦ Benefícios</div>
        <h2 className="section-title">
          Desbloqueie o<br />
          <span>Potencial Total</span>
        </h2>
        <p className="section-sub">
          Viva a experiência completa que um agente de I.A super treinado pode oferecer
          para sua equipe e seus clientes dentro do seu próprio WhatsApp.
        </p>

        <div className="benefits-grid">
          <div>
            <div className="benefits-tabs">
              {tabs.map((t, i) => (
                <button
                  key={t.label}
                  className={`tab-btn${active === i ? " active" : ""}`}
                  onClick={() => setActive(i)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                >
                  <Icon
                    name={t.iconName}
                    size={13}
                    color={active === i ? "#fff" : "currentColor"}
                  />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="benefits-content">
              <h3>{tab.title}</h3>
              <p>{tab.desc}</p>
            </div>
          </div>

          <div className="benefits-img">
            <img src={`${BASE}images/${tab.img}`} alt={tab.title} />
          </div>
        </div>
      </div>
    </section>
  );
}
