import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../contexts/auth";
import { useNotifications } from "../hooks/useNotifications";

const BASE = import.meta.env.BASE_URL;

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function isActive(location: string, href: string) {
  if (href === "/app") return location === "/app";
  return location.startsWith(href);
}

const navItems = [
  { href: "/app",               label: "Dashboard",     icon: "📊" },
  { href: "/app/agents",        label: "Agentes",       icon: "🤖" },
  { href: "/app/conversations", label: "Conversas",     icon: "💬", badge: true },
  { href: "/app/settings",      label: "Configurações", icon: "⚙️" },
];

function HamburgerIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
      <rect y="0"  width="18" height="2" rx="1"/>
      <rect y="6"  width="13" height="2" rx="1"/>
      <rect y="12" width="18" height="2" rx="1"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="1" y1="1" x2="13" y2="13"/>
      <line x1="13" y1="1" x2="1" y2="13"/>
    </svg>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { unreadCount, lastNotif } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-root">
      <style>{`
        @keyframes slideInToast {
          from { transform: translateX(120%) scale(0.9); opacity: 0; }
          to   { transform: translateX(0) scale(1);   opacity: 1; }
        }
        @keyframes toastFadeOut {
          0%   { opacity: 1; transform: translateX(0); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateX(40px); }
        }
      `}</style>

      {/* Mobile overlay */}
      <div
        className={`app-overlay ${sidebarOpen ? "overlay-open" : ""}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        {/* Logo */}
        <div style={{ padding: "20px 18px", borderBottom: "1px solid rgba(139,92,246,0.10)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" onClick={closeSidebar}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ position: "relative" }}>
                <img src={`${BASE}images/logo.jpg`} alt="logo" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: -2, borderRadius: "50%", border: "1.5px solid rgba(139,92,246,0.4)", pointerEvents: "none" }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#8b5cf6", lineHeight: 1.2 }}>Robô de Vendas</div>
                <div style={{ fontSize: 10, color: "#9992b8" }}>Networking VIP</div>
              </div>
            </div>
          </Link>
          {/* Close button (mobile only, hidden via CSS on desktop) */}
          <button onClick={closeSidebar} className="hamburger" style={{ display: "none" }}
            id="sidebar-close-btn">
            <CloseIcon />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {navItems.map(item => {
            const active = isActive(location, item.href);
            const showBadge = item.badge && unreadCount > 0;
            return (
              <Link key={item.href} href={item.href} onClick={closeSidebar}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 10, marginBottom: 2, cursor: "pointer",
                  background: active ? "rgba(139,92,246,0.12)" : "transparent",
                  color: active ? "#a78bfa" : "#9992b8",
                  fontWeight: active ? 700 : 600, fontSize: 14,
                  borderLeft: `2px solid ${active ? "#8b5cf6" : "transparent"}`,
                  transition: "all 0.15s",
                  position: "relative",
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(139,92,246,0.06)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 17, lineHeight: 1 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {showBadge && (
                    <span style={{
                      minWidth: 20, height: 20, padding: "0 5px", borderRadius: 10,
                      background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                      color: "#fff", fontSize: 11, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      animation: "badgePulse 1.5s ease-in-out 3",
                    }}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div style={{ margin: "0 16px", height: 1, background: "rgba(139,92,246,0.08)" }} />

        {/* User */}
        <Link href="/app/profile" onClick={closeSidebar}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: "pointer",
            background: location === "/app/profile" ? "rgba(139,92,246,0.08)" : "transparent",
            transition: "background 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.06)"}
            onMouseLeave={e => e.currentTarget.style.background = location === "/app/profile" ? "rgba(139,92,246,0.08)" : "transparent"}
          >
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 900, color: "#fff",
              boxShadow: "0 2px 10px rgba(139,92,246,0.35)",
            }}>
              {getInitials(user?.name ?? "U")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: "#9992b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9992b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </Link>

        <div style={{ padding: "0 12px 14px" }}>
          <button onClick={logout} style={{
            width: "100%", padding: "9px", borderRadius: 8, background: "transparent",
            border: "1px solid rgba(139,92,246,0.12)", color: "#9992b8", fontSize: 13,
            fontWeight: 600, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9992b8"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.12)"; }}
          >
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Right side */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Mobile top bar */}
        <div className="app-mobile-topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>
            <HamburgerIcon />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={`${BASE}images/logo.jpg`} alt="logo" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#8b5cf6" }}>Robô de Vendas</span>
          </div>
          <Link href="/app/profile">
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 900, color: "#fff", cursor: "pointer",
            }}>
              {getInitials(user?.name ?? "U")}
            </div>
          </Link>
        </div>

        {/* Main content */}
        <main className="app-main">
          {children}
        </main>
      </div>

      {/* Toast for new WhatsApp messages */}
      {lastNotif && <Toast notif={lastNotif} />}

      <style>{`
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139,92,246,0.6); }
          50%       { transform: scale(1.25); box-shadow: 0 0 0 6px rgba(139,92,246,0); }
        }
      `}</style>
    </div>
  );
}

function Toast({ notif }: { notif: { contactName: string; text: string } | null }) {
  if (!notif) return null;
  return (
    <div key={`${notif.contactName}-${notif.text?.slice(0,10)}`} style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: "#0e0e1a",
      border: "1px solid rgba(139,92,246,0.3)",
      borderRadius: 16, padding: "14px 18px", maxWidth: 320, minWidth: 260,
      boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)",
      animation: "slideInToast 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
      display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
        background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        boxShadow: "0 4px 12px rgba(139,92,246,0.4)",
      }}>💬</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, color: "#9992b8", marginBottom: 2 }}>Nova mensagem WhatsApp</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{notif.contactName}</div>
        <div style={{ fontSize: 12, color: "#9992b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {notif.text}
        </div>
      </div>
    </div>
  );
}
