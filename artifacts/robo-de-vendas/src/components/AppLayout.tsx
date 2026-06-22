import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../contexts/auth";

const BASE = import.meta.env.BASE_URL;

const navItems = [
  { href: "/app", label: "Dashboard", icon: "📊" },
  { href: "/app/agents", label: "Agentes", icon: "🤖" },
  { href: "/app/conversations", label: "Conversas", icon: "💬" },
  { href: "/app/settings", label: "Configurações", icon: "⚙️" },
];

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function isActive(location: string, href: string) {
  if (href === "/app") return location === "/app";
  return location.startsWith(href);
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  return (
    <div style={{ display: "flex", height: "100vh", background: "#000000", color: "#ffffff", fontFamily: "'Manrope', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0, background: "#080810",
        borderRight: "1px solid rgba(139,92,246,0.10)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Logo */}
        <div style={{ padding: "22px 20px", borderBottom: "1px solid rgba(139,92,246,0.10)" }}>
          <Link href="/">
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <img src={`${BASE}images/logo.jpg`} alt="logo" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#8b5cf6" }}>Robô de Vendas</div>
                <div style={{ fontSize: 11, color: "#9992b8" }}>Networking VIP</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
          {navItems.map(item => {
            const active = isActive(location, item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 8, marginBottom: 2, cursor: "pointer",
                  background: active ? "rgba(139,92,246,0.12)" : "transparent",
                  color: active ? "#a78bfa" : "#9992b8",
                  fontWeight: active ? 700 : 600, fontSize: 14,
                  borderLeft: active ? "2px solid #8b5cf6" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(139,92,246,0.06)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 17 }}>{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ borderTop: "1px solid rgba(139,92,246,0.10)" }}>
          <Link href="/app/profile">
            <div style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer",
              background: location === "/app/profile" ? "rgba(139,92,246,0.08)" : "transparent",
              transition: "background 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = location === "/app/profile" ? "rgba(139,92,246,0.08)" : "transparent"}
            >
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 900, color: "#fff", flexShrink: 0,
              }}>
                {getInitials(user?.name ?? "U")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: "#9992b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9992b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </Link>
          <div style={{ padding: "0 12px 14px" }}>
            <button onClick={logout} style={{
              width: "100%", padding: "9px", borderRadius: 8,
              background: "transparent", border: "1px solid rgba(139,92,246,0.12)",
              color: "#9992b8", fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9992b8"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.12)"; }}
            >
              Sair da conta
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", padding: 32 }}>
        {children}
      </main>
    </div>
  );
}
