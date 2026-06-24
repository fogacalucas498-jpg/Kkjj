import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "../../contexts/auth";
import { agentsApi, conversationsApi, statsApi, type Agent, type Conversation, type Stats } from "../../lib/api";
import { Icon, type IconName } from "../../components/Icon";

/* ── Animated counter ── */
function useCounter(target: number, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const t = setTimeout(() => {
      const start = Date.now();
      const dur = 1100;
      const tick = () => {
        const p = Math.min((Date.now() - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(Math.floor(eased * target));
        if (p < 1) requestAnimationFrame(tick);
        else setVal(target);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, delay]);
  return val;
}

/* ── Fill last 7 days (including missing days as 0) ── */
function fillDays(raw: { day: string; count: number }[]) {
  const map = new Map(raw.map(r => [r.day, r.count]));
  const days: { label: string; count: number; dateStr: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    days.push({ label: label.charAt(0).toUpperCase() + label.slice(1), count: map.get(dateStr) ?? 0, dateStr });
  }
  return days;
}

/* ── Custom SVG bar chart ── */
function BarChart({ data }: { data: { label: string; count: number }[] }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 200); return () => clearTimeout(t); }, []);
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const chartH = 120;
  const barW = 28;
  const gap = 14;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${totalW + 8} ${chartH + 24}`} style={{ width: "100%", minWidth: totalW + 8, display: "block" }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="barGradDim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(139,92,246,0.55)" />
            <stop offset="100%" stopColor="rgba(109,40,217,0.3)" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map(frac => {
          const y = chartH - frac * (chartH - 16);
          return (
            <line key={frac} x1={0} y1={y} x2={totalW + 8} y2={y}
              stroke="rgba(139,92,246,0.08)" strokeWidth={1} />
          );
        })}

        {data.map((d, i) => {
          const barH = maxVal > 0 ? Math.max((d.count / maxVal) * (chartH - 20), d.count > 0 ? 4 : 0) : 0;
          const x = i * (barW + gap) + 4;
          const y = chartH - 16 - barH;
          const grad = i === data.length - 1 ? "url(#barGrad)" : "url(#barGradDim)";
          return (
            <g key={i}>
              {barH > 0 && (
                <rect
                  x={x} y={y} width={barW} height={barH} rx={6}
                  fill={grad}
                  style={{
                    transformOrigin: `${x + barW / 2}px ${chartH - 16}px`,
                    transform: ready ? "scaleY(1)" : "scaleY(0)",
                    transition: `transform 0.5s cubic-bezier(0.34,1.2,0.64,1) ${i * 0.06}s`,
                  }}
                />
              )}
              {barH === 0 && (
                <rect x={x} y={chartH - 18} width={barW} height={2} rx={1} fill="rgba(139,92,246,0.12)" />
              )}
              {d.count > 0 && ready && (
                <text x={x + barW / 2} y={y - 5} textAnchor="middle"
                  fill="rgba(255,255,255,0.7)" fontSize={9} fontWeight="700" fontFamily="Manrope, sans-serif">
                  {d.count}
                </text>
              )}
              <text x={x + barW / 2} y={chartH + 14} textAnchor="middle"
                fill={i === data.length - 1 ? "#a78bfa" : "#9992b8"} fontSize={9}
                fontWeight={i === data.length - 1 ? "700" : "500"} fontFamily="Manrope, sans-serif">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Stat card ── */
function StatCard({
  label, value, sub, iconName, color, delay,
  isText = false,
}: {
  label: string; value: number | string; sub?: string; iconName: IconName;
  color: string; delay: number; isText?: boolean;
}) {
  const numVal = typeof value === "number" ? value : 0;
  const animated = useCounter(isText ? 0 : numVal, delay);
  const display = isText ? value : animated;

  return (
    <div className={`stat-card anim-fade-up anim-delay-${delay / 80}`}
      style={{ animationDelay: `${delay}ms` }}>
      <div style={{
        position: "absolute", top: -20, right: -20, width: 80, height: 80,
        borderRadius: "50%", background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `linear-gradient(135deg, ${color}22, ${color}11)`,
          border: `1px solid ${color}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name={iconName} size={18} color={color} />
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: "#9992b8", background: "rgba(139,92,246,0.06)", padding: "3px 8px", borderRadius: 100, border: "1px solid rgba(139,92,246,0.1)" }}>
            {sub}
          </div>
        )}
      </div>

      <div style={{
        fontSize: 32, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 4,
        color: color, lineHeight: 1,
      }}>
        {display}
      </div>
      <div style={{ fontSize: 12, color: "#9992b8", fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function formatResponseTime(secs: number | null) {
  if (secs == null) return "—";
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      agentsApi.list().then(setAgents),
      conversationsApi.list().then(setConversations).catch(() => {}),
      statsApi.get().then(setStats).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const chartData = stats ? fillDays(stats.messagesPerDay) : fillDays([]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <div>
      {/* ── Header ── */}
      <div className="anim-fade-up" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>
            {greeting}, <span className="grad-text">{firstName}!</span>
          </h1>
          <span style={{ fontSize: 24 }}>👋</span>
        </div>
        {user?.dashboardName && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 12px", background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.22)", borderRadius: 100, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>{user.dashboardName}</span>
          </div>
        )}
        <p style={{ color: "#9992b8", fontSize: 14 }}>
          Painel de controle · {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Agentes criados"          value={stats?.totalAgents ?? 0}    iconName="robot"         color="#8b5cf6" delay={80} />
        <StatCard label="WhatsApp conectado"        value={stats?.connectedAgents ?? 0} iconName="whatsapp"      color="#a78bfa" delay={160} sub="ao vivo" />
        <StatCard label="Mensagens hoje"            value={stats?.todayMessages ?? 0}  iconName="comments"      color="#7c3aed" delay={240} sub="hoje" />
        <StatCard
          label="Tempo médio de resposta"
          value={formatResponseTime(stats?.avgResponseSecs ?? null)}
          iconName="bolt" color="#c4b5fd" delay={320} isText
        />
      </div>

      {/* ── Chart card ── */}
      <div className="glow-card anim-fade-up anim-delay-5" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Mensagens nos últimos 7 dias</h2>
            <p style={{ fontSize: 12, color: "#9992b8" }}>
              Total: <span style={{ color: "#a78bfa", fontWeight: 700 }}>{stats?.totalMessages ?? 0}</span> mensagens ·
              Conversas: <span style={{ color: "#a78bfa", fontWeight: 700 }}>{stats?.totalConversations ?? 0}</span>
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "#9992b8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: "linear-gradient(#a78bfa, #7c3aed)" }} />
              Hoje
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: "rgba(139,92,246,0.4)" }} />
              Anteriores
            </div>
          </div>
        </div>
        <BarChart data={chartData} />
      </div>

      {/* ── Agents + Conversations ── */}
      <div className="dash-panels">
        {/* Agents */}
        <div className="glow-card anim-fade-up anim-delay-6">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800 }}>Seus Agentes</h2>
            <Link href="/app/agents">
              <span style={{ fontSize: 12, color: "#8b5cf6", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                Ver todos <Icon name="arrow-right" size={11} color="#8b5cf6" />
              </span>
            </Link>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 44, borderRadius: 10, background: "rgba(139,92,246,0.05)", animation: "shimmer 1.5s infinite" }} />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>
                <Icon name="robot" size={40} color="rgba(139,92,246,0.25)" />
              </div>
              <p style={{ color: "#9992b8", fontSize: 13, marginBottom: 16 }}>Nenhum agente criado ainda</p>
              <Link href="/app/agents">
                <button style={{ padding: "8px 18px", background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  + Criar Agente
                </button>
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {agents.slice(0, 5).map((a, i) => (
                <Link key={a.id} href={`/app/agents/${a.id}`}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: `linear-gradient(135deg, rgba(139,92,246,${0.15 + i * 0.05}), rgba(109,40,217,0.1))`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon name="robot" size={16} color="#a78bfa" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: "#9992b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description || "Sem descrição"}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {a.whatsapp?.status === "connected" && <span className="dot-connected" />}
                      <span style={{
                        padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700,
                        background: a.whatsapp?.status === "connected" ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
                        color: a.whatsapp?.status === "connected" ? "#a78bfa" : "#9992b8",
                      }}>
                        {a.whatsapp?.status === "connected" ? "Conectado" : "Offline"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Conversations */}
        <div className="glow-card anim-fade-up anim-delay-6">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800 }}>Conversas Recentes</h2>
            <Link href="/app/conversations">
              <span style={{ fontSize: 12, color: "#8b5cf6", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                Ver todas <Icon name="arrow-right" size={11} color="#8b5cf6" />
              </span>
            </Link>
          </div>

          {conversations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>
                <Icon name="comments" size={40} color="rgba(139,92,246,0.25)" />
              </div>
              <p style={{ color: "#9992b8", fontSize: 13 }}>
                Nenhuma conversa ainda.<br />
                <span style={{ color: "#8b5cf6", fontWeight: 600 }}>Conecte um agente ao WhatsApp!</span>
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {conversations.slice(0, 5).map(c => {
                const initials = (c.contactName ?? c.contactPhone).slice(0, 2).toUpperCase();
                const timeAgo = c.lastMessageAt ? timeAgoStr(c.lastMessageAt) : null;
                return (
                  <Link key={c.id} href={`/app/conversations/${c.id}`}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.05)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                        background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.15))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 800, color: "#a78bfa",
                      }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{c.contactName || c.contactPhone}</div>
                        <div style={{ fontSize: 11, color: "#9992b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.lastMessage || "..."}
                        </div>
                      </div>
                      {timeAgo && (
                        <div style={{ fontSize: 10, color: "#9992b8", flexShrink: 0 }}>{timeAgo}</div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick start ── */}
      {!loading && agents.length === 0 && (
        <div className="anim-fade-up" style={{
          marginTop: 24, padding: 28, borderRadius: 18,
          background: "linear-gradient(135deg, rgba(139,92,246,0.07), rgba(109,40,217,0.03))",
          border: "1px solid rgba(139,92,246,0.18)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)",
            animation: "scanLine 3s linear infinite",
          }} />
          <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>🚀 Comece em 3 passos</h3>
          <p style={{ fontSize: 13, color: "#9992b8", marginBottom: 20 }}>Configure seu primeiro agente de IA para WhatsApp</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            {[
              { step: "1", text: "Crie seu primeiro agente", desc: "Configure nome e instruções", link: "/app/agents" },
              { step: "2", text: "Base de conhecimento", desc: "Adicione FAQs e informações", link: "/app/agents" },
              { step: "3", text: "Conecte ao WhatsApp", desc: "Escaneie o QR Code", link: "/app/agents" },
            ].map(s => (
              <Link key={s.step} href={s.link}>
                <div style={{
                  padding: 16, borderRadius: 14,
                  background: "rgba(139,92,246,0.05)",
                  border: "1px solid rgba(139,92,246,0.10)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.10)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(139,92,246,0.05)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.10)"; }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900, fontSize: 13, marginBottom: 10,
                    boxShadow: "0 4px 12px rgba(139,92,246,0.4)",
                  }}>{s.step}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{s.text}</div>
                  <div style={{ fontSize: 11, color: "#9992b8" }}>{s.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgoStr(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
