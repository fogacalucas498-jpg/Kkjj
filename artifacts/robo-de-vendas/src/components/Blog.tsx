const BASE = import.meta.env.BASE_URL;

const posts = [
  {
    date: "5 de março de 2025",
    title: "Como usar chatbots para melhorar o envolvimento do cliente",
    img: "blog1.jpg",
  },
  {
    date: "12 de fevereiro de 2025",
    title: "5 estratégias para escalar atendimento com I.A no WhatsApp",
    img: "dashboard3.png",
  },
  {
    date: "20 de janeiro de 2025",
    title: "Segurança de dados em plataformas de I.A: o que você precisa saber",
    img: "feature1.png",
  },
];

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function Blog() {
  return (
    <section className="blog-section" id="blog">
      <div className="container">
        <div className="blog-header">
          <div>
            <div className="section-tag">✦ Blog</div>
            <h2 className="section-title">Últimos <span>Insights</span></h2>
          </div>
          <a href="#" className="blog-link">
            Ver todos <ArrowIcon />
          </a>
        </div>

        <div className="blog-cards">
          {posts.map((p) => (
            <div key={p.title} className="blog-card">
              <img
                className="blog-card-img"
                src={`${BASE}images/${p.img}`}
                alt={p.title}
              />
              <div className="blog-card-body">
                <p className="blog-date">{p.date}</p>
                <h3>{p.title}</h3>
                <a href="#" className="blog-link">
                  Descobrir Mais <ArrowIcon />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
