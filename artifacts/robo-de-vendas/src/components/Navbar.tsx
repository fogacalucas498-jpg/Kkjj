import { useState, useEffect } from "react";

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
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#25d366"/>
              <path d="M16 6C10.477 6 6 10.477 6 16c0 1.77.466 3.432 1.28 4.872L6 26l5.302-1.256A9.96 9.96 0 0016 26c5.523 0 10-4.477 10-10S21.523 6 16 6z" fill="white"/>
              <path d="M13 13.5c0-.276.224-.5.5-.5h5c.276 0 .5.224.5.5s-.224.5-.5.5h-5a.5.5 0 01-.5-.5zM13 16c0-.276.224-.5.5-.5h5c.276 0 .5.224.5.5s-.224.5-.5.5h-5a.5.5 0 01-.5-.5zM13 18.5c0-.276.224-.5.5-.5h3c.276 0 .5.224.5.5s-.224.5-.5.5h-3a.5.5 0 01-.5-.5z" fill="#25d366"/>
            </svg>
            <span className="logo-text">Robô de Vendas<br/>Networking VIP</span>
          </a>

          <nav className="navbar-nav">
            <a href="#pricing">Preços</a>
            <a href="#blog">Blog</a>
            <a href="#contact">Contato</a>
          </nav>

          <div className="navbar-actions">
            <button className="btn-ghost">Acessar</button>
            <button className="btn-primary">TESTE GRÁTIS</button>
          </div>
        </div>
      </div>
    </nav>
  );
}
