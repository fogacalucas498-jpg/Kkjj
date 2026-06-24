import { useState } from "react";
import { Icon } from "./Icon";

const faqs = [
  {
    q: "Como usar chatbots para melhorar o envolvimento do cliente?",
    a: "Os chatbots de I.A do Robô de Vendas - Networking VIP são treinados com o conhecimento do seu negócio e respondem de forma natural e personalizada. Isso aumenta o tempo de resposta, reduz o custo de atendimento e melhora a satisfação do cliente de forma significativa.",
  },
  {
    q: "Como lidam com segurança de dados?",
    a: "Utilizamos criptografia de ponta, autenticação JWT e firewalls avançados. Todos os dados são armazenados em servidores cloud de alto padrão com redundância e backup. Somos 100% compatíveis com a LGPD brasileira e nunca utilizamos seus dados para treinar modelos públicos.",
  },
  {
    q: "É possível executar ações no robô?",
    a: "Sim! Além de responder dúvidas, os agentes podem executar pré-vendas, qualificar leads, agendar reuniões, enviar documentos e muito mais. Você define as regras e o agente executa.",
  },
  {
    q: "Com quais documentos e arquivos posso treinar meu agente?",
    a: "Você pode treinar seu agente com PDFs, documentos de texto, instruções customizadas, perguntas frequentes, bases de conhecimento e muito mais. O processo é simples e feito diretamente pela plataforma, sem necessidade de conhecimento técnico.",
  },
  {
    q: "Quantas mensagens posso receber por mês?",
    a: "No plano Start gratuito, você tem até 1.000 mensagens por mês. No plano Pro e Ultra, as mensagens são ilimitadas. Todos os planos são 100% gratuitos no Robô de Vendas - Networking VIP.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="faq-section">
      <div className="container">
        <div className="faq-grid">
          <div className="faq-left">
            <div className="section-tag">✦ FAQ</div>
            <h2 className="section-title">Perguntas<br /><span>Frequentes</span></h2>
            <p className="section-sub">
              Tire suas dúvidas sobre a plataforma e entenda como o Robô de Vendas
              pode transformar o atendimento do seu negócio.
            </p>
            <div className="faq-note">
              <strong>Para Pessoas Exclusivas</strong><br />
              Faça parte da lista exclusiva de grandes clientes que estão transformando
              as experiências no WhatsApp e inicie agora mesmo!
            </div>
          </div>

          <div className="faq-list">
            {faqs.map((f, i) => (
              <div key={i} className={`faq-item${open === i ? " open" : ""}`}>
                <button className="faq-question" onClick={() => setOpen(open === i ? null : i)}>
                  {f.q}
                  <span className="faq-icon">
                    <Icon
                      name={open === i ? "xmark" : "plus"}
                      size={14}
                      color={open === i ? "#8b5cf6" : "currentColor"}
                    />
                  </span>
                </button>
                <div className={`faq-answer${open === i ? " open" : ""}`}>
                  {f.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
