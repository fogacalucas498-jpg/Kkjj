import { useState, useEffect } from "react";
import { Icon } from "./Icon";

const BASE = import.meta.env.BASE_URL;

function navigate(path: string) {
  window.location.href = BASE.endsWith("/") ? `${BASE}${path.replace(/^\//, "")}` : `${BASE}${path}`;
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav className="navbar" style={scrolled ? { background: "rgba(7,9,15,0.97)", boxShadow: "0 4px 32px rgba(0,0,0,0.4)" } : {}}>
      <div className="container">
        <div className="navbar-inner">
          <a href="#" className="navbar-logo">
            <img
              src={`${BASE}images/logo.jpg`}
              alt="Robô de Vendas - Networking VIP"
              style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(139,92,246,0.5)", flexShrink: 0 }}
            />
            <span className="logo-text">Robô de Vendas<br/>Networking VIP</span>
          </a>

          <nav className="navbar-nav">
            <a href="#pricing">Preços</a>
            <a href="#blog">Blog</a>
            <a href="#contact">Contato</a>
          </nav>

          <div className="navbar-actions">
            <button
              className="btn-ghost"
              onClick={() => navigate("/login")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <Icon name="right-from-bracket" size={13} color="currentColor" />
              Acessar
            </button>
            <button
              className="btn-primary"
              onClick={() => navigate("/register")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <Icon name="bolt" size={13} color="#fff" />
              TESTE GRÁTIS
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
