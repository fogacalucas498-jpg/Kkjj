import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../contexts/auth";

const BASE = import.meta.env.BASE_URL;

const navItems = [
  { href: "/app", label: "Dashboard", icon: "📊" },
  { href: "/app/agents", label: "Agentes", icon: "🤖" },
  { href: "/app/conversations", label: "Conversas", icon: "💬" },
  { href: "/app/settings", label: "Configurações", icon: "⚙️" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#07090f", color: "#f0f4ff", fontFamily: "'Manrope', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0, background: "#0d1117", borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column", padding: "24px 0",
      }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/">
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <img src={`${BASE}images/logo.jpg`} alt="logo" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#25d366" }}>Robô de Vendas</div>
                <div style={{ fontSize: 11, color: "#8b98b4" }}>Networking VIP</div>
              </div>
            </div>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: "16px 12px" }}>
          {navItems.map(item => (
            <Link key={item.href} href={item.href}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 8, marginBottom: 4, cursor: "pointer",
                background: location === item.href || (item.href !== "/app" && location.startsWith(item.href))
                  ? "rgba(37,211,102,0.12)" : "transparent",
                color: location === item.href || (item.href !== "/app" && location.startsWith(item.href))
                  ? "#25d366" : "#8b98b4",
                fontWeight: 600, fontSize: 14,
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#f0f4ff" }}>{user?.name}</div>
          <div style={{ fontSize: 12, color: "#8b98b4", marginBottom: 12, overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
          <button onClick={logout} style={{
            width: "100%", padding: "8px", borderRadius: 6, background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)", color: "#8b98b4", fontSize: 13,
            fontWeight: 600, cursor: "pointer",
          }}>Sair</button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", padding: 32 }}>
        {children}
      </main>
    </div>
  );
}
