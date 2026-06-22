const steps = [
  {
    num: "01",
    emoji: "🤖",
    title: "Treine Agentes",
    desc: "Administre o conteúdo ensinado ao seu agente de forma fácil e ampla com o nosso editor de agentes poderoso e extremamente simples de usar.",
  },
  {
    num: "02",
    emoji: "📱",
    title: "Conecte os Números",
    desc: "Seja com documentações, PDFs, Instruções ou Bases de Conhecimento, existem diversas formas de alimentar o conhecimento sobre sua empresa para seu agente.",
  },
  {
    num: "03",
    emoji: "📈",
    title: "Veja os Resultados",
    desc: "Mantenha o controle absoluto do fluxo de conversa. Agentes humanos podem intervir a qualquer momento ao enviar uma mensagem!",
  },
];

export default function HowItWorks() {
  return (
    <section className="how-section">
      <div className="container">
        <div className="how-header">
          <div className="section-tag">✦ Como Funciona</div>
          <h2 className="section-title">
            Como Nossa Ferramenta<br />
            <span>Melhora a Produtividade</span>
          </h2>
          <p className="section-sub">
            Com o nosso construtor de agentes, sua única preocupação é fornecer a base de
            conhecimento ao agente e conectar sua conta do WhatsApp.
          </p>
        </div>

        <div className="how-steps">
          {steps.map((s) => (
            <div key={s.title} className="how-step">
              <div className="how-step-num">{s.num}</div>
              <div className="how-step-icon">{s.emoji}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
