const badges = [
  "Gerenciamento Simplificado",
  "AI Powered",
  "Totalmente Cloud",
  "Relatórios Precisos",
  "Múltiplos Agentes",
  "Segurança de Dados",
  "Planos Simplificados",
  "Diversos Números",
  "Economize Tempo",
  "Controle os Leads",
  "Use Documentos",
  "Fácil Configuração",
  "Colabore com o Time",
  "Pague pelo Uso",
];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function BadgesStrip() {
  return (
    <section className="badges-section">
      <div className="container">
        <p className="badges-label">Perfeita Para Qualquer Negócio</p>
        <div className="badges-track">
          {badges.map((b) => (
            <div key={b} className="badge-item">
              <CheckIcon />
              {b}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
