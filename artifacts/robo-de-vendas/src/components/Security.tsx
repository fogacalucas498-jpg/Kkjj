import { Icon } from "./Icon";

const BASE = import.meta.env.BASE_URL;

export default function Security() {
  return (
    <section className="security-section">
      <div className="container">
        <div className="security-grid">
          <div className="security-content">
            <div className="security-icon">
              <Icon name="lock" size={36} color="#8b5cf6" />
            </div>
            <div className="section-tag">✦ Segurança</div>
            <h2 className="section-title">
              Sem Deixar<br /><span>Dúvidas</span>
            </h2>
            <p>
              Os seus dados ou chaves de API jamais serão utilizados de forma pública para
              treinar novos agentes em nossas LLMs. Somos 100% dedicados a manter toda a
              estrutura de segurança de dados necessária e de acordo com a LGPD.
              Periodicamente, fornecemos relatórios sobre segurança aos nossos clientes.
            </p>
          </div>

          <div className="security-img">
            <img src={`${BASE}images/feature2.png`} alt="Segurança de dados" />
          </div>
        </div>
      </div>
    </section>
  );
}
