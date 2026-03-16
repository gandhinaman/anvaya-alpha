import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Navigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { Users, Activity, Clock, MousePointerClick, LogOut, RefreshCw, ArrowLeft, MessageCircle } from "lucide-react";

const COLORS = ["#8D6E63", "#C68B59", "#059669", "#5D4037", "#A1887F", "#2C1810"];
const ROLE_LABELS: Record<string, string> = { parent: "Loved One", child: "Care Partner" };
const FEATURE_LABELS: Record<string, string> = {
  record_memory: "Record Memory", open_memory_log: "Memory Log", open_chat: "Ask Ela",
  call_family: "Call Family", ela_chat: "Ela Message", view_memories: "View Memories",
  view_overview: "Overview", view_settings: "Settings", view_alerts: "Alerts",
  view_health: "Health", view_rhythm: "Daily Rhythm",
};

interface SessionRow {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  role: string | null;
  user_agent: string | null;
}

interface EventRow {
  id: string;
  session_id: string;
  user_id: string;
  event_type: string;
  event_name: string;
  metadata: any;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  role: string;
}

export default function AdminDashboard() {
  const { profile, loading: profileLoading } = useProfile();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  }, [days]);

  const fetchData = async () => {
    setLoading(true);
    const [sRes, eRes, pRes] = await Promise.all([
      supabase.from("telemetry_sessions").select("*").gte("started_at", cutoff).neq("role", "admin").order("started_at", { ascending: false }),
      supabase.from("telemetry_events").select("*").gte("created_at", cutoff).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, role").neq("role", "admin"),
    ]);
    // Filter events to only non-admin users
    const nonAdminUserIds = new Set((pRes.data || []).map((p: any) => p.id));
    const filteredEvents = (eRes.data || []).filter((e: any) => nonAdminUserIds.has(e.user_id));
    setSessions((sRes.data || []) as any);
    setEvents(filteredEvents as any);
    setProfiles((pRes.data || []) as any);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [cutoff]);

  if (profileLoading) return <LoadingScreen />;
  if (!profile || profile.role !== "admin") return <Navigate to="/login" replace />;

  // ─── Computed metrics ──────────────────────────────────────
  const uniqueUsers = new Set(sessions.map(s => s.user_id)).size;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter(s => s.started_at.slice(0, 10) === todayStr).length;
  const avgDuration = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0) / sessions.length)
    : 0;
  const totalEvents = events.length;

  // DAU chart
  const dauMap: Record<string, Set<string>> = {};
  sessions.forEach(s => {
    const day = s.started_at.slice(0, 10);
    if (!dauMap[day]) dauMap[day] = new Set();
    dauMap[day].add(s.user_id);
  });
  const dauData = Object.entries(dauMap)
    .map(([date, users]) => ({ date: date.slice(5), users: users.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top features
  const featureMap: Record<string, number> = {};
  events.filter(e => e.event_type === "feature_use").forEach(e => {
    featureMap[e.event_name] = (featureMap[e.event_name] || 0) + 1;
  });
  const topFeatures = Object.entries(featureMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const roleMap: Record<string, number> = {};
  profiles.forEach(p => { const label = ROLE_LABELS[p.role] || p.role; roleMap[label] = (roleMap[label] || 0) + 1; });
  const roleData = Object.entries(roleMap).map(([name, value]) => ({ name, value }));

  // User table
  const userStats = profiles
    .filter(p => p.role !== "admin")
    .map(p => {
      const userSessions = sessions.filter(s => s.user_id === p.id);
      const userEvents = events.filter(e => e.user_id === p.id && e.event_type === "feature_use");
      const lastSession = userSessions[0];
      const topFeature = (() => {
        const fm: Record<string, number> = {};
        userEvents.forEach(e => { fm[e.event_name] = (fm[e.event_name] || 0) + 1; });
        const sorted = Object.entries(fm).sort((a, b) => b[1] - a[1]);
        return sorted[0]?.[0] || "—";
      })();
      return {
        id: p.id,
        name: p.full_name || "Unknown",
        role: p.role,
        sessions: userSessions.length,
        events: userEvents.length,
        lastActive: lastSession ? new Date(lastSession.started_at).toLocaleDateString() : "—",
        topFeature: FEATURE_LABELS[topFeature] || topFeature,
      };
    })
    .sort((a, b) => b.sessions - a.sessions);

  // Page views
  const pageMap: Record<string, number> = {};
  events.filter(e => e.event_type === "page_view").forEach(e => {
    pageMap[e.event_name] = (pageMap[e.event_name] || 0) + 1;
  });
  const pageData = Object.entries(pageMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  const handleLogout = async () => {
    await flushTelemetry();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F0EB", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Header */}
      <header style={{
        background: "#2C1810", color: "#FFF8F0", padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px" }}>Anvaya Admin</h1>
          <p style={{ fontSize: 12, opacity: 0.6 }}>Telemetry Dashboard</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Date filter */}
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            style={{
              background: "rgba(255,255,255,0.1)", color: "#FFF8F0", border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer",
            }}
          >
            <option value={7} style={{ color: "#000" }}>7 days</option>
            <option value={14} style={{ color: "#000" }}>14 days</option>
            <option value={30} style={{ color: "#000" }}>30 days</option>
            <option value={90} style={{ color: "#000" }}>90 days</option>
          </select>
          <button onClick={fetchData} style={{
            background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8,
            padding: 8, cursor: "pointer", color: "#FFF8F0",
          }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={handleLogout} style={{
            background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8,
            padding: 8, cursor: "pointer", color: "#FFF8F0",
          }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "#8D6E63" }}>Loading telemetry data…</div>
      ) : (
        <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
            <SummaryCard icon={<Users size={20} />} label="Unique Users" value={uniqueUsers} color="#059669" />
            <SummaryCard icon={<Activity size={20} />} label="Sessions Today" value={todaySessions} color="#C68B59" />
            <SummaryCard icon={<Clock size={20} />} label="Avg Duration" value={`${avgDuration}s`} color="#8D6E63" />
            <SummaryCard icon={<MousePointerClick size={20} />} label="Total Events" value={totalEvents} color="#5D4037" />
          </div>

          {/* Charts Row */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 28 }}>
            {/* DAU Chart */}
            <ChartCard title="Daily Active Users">
              {dauData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dauData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0d6cc" />
                    <XAxis dataKey="date" fontSize={11} stroke="#8D6E63" />
                    <YAxis fontSize={11} stroke="#8D6E63" allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="#C68B59" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyState />}
            </ChartCard>

            {/* Role Distribution */}
            <ChartCard title="Users by Role">
              {roleData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                      {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState />}
            </ChartCard>
          </div>

          {/* Features + Pages Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
            <ChartCard title="Top Features">
              {topFeatures.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topFeatures} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0d6cc" />
                    <XAxis type="number" fontSize={11} stroke="#8D6E63" />
                    <YAxis dataKey="name" type="category" fontSize={11} stroke="#8D6E63" width={120} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#C68B59" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState />}
            </ChartCard>

            <ChartCard title="Page Views">
              {pageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={pageData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0d6cc" />
                    <XAxis type="number" fontSize={11} stroke="#8D6E63" />
                    <YAxis dataKey="name" type="category" fontSize={11} stroke="#8D6E63" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8D6E63" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState />}
            </ChartCard>
          </div>

          {/* User Table */}
          <ChartCard title="User Activity Breakdown">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e0d6cc", textAlign: "left" }}>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Sessions</th>
                    <th style={thStyle}>Events</th>
                    <th style={thStyle}>Last Active</th>
                    <th style={thStyle}>Top Feature</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {userStats.map((u, i) => (
                    <tr key={i} onClick={() => setSelectedUserId(selectedUserId === u.id ? null : u.id)} style={{
                      borderBottom: "1px solid #f0e8e0", cursor: "pointer",
                      background: selectedUserId === u.id ? "#F5F0EB" : "transparent",
                      transition: "background 0.15s",
                    }}>
                      <td style={tdStyle}>{u.name}</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                          background: u.role === "parent" ? "#FFF3E0" : "#E8F5E9",
                          color: u.role === "parent" ? "#E65100" : "#2E7D32",
                        }}>{ROLE_LABELS[u.role] || u.role}</span>
                      </td>
                      <td style={tdStyle}>{u.sessions}</td>
                      <td style={tdStyle}>{u.events}</td>
                      <td style={tdStyle}>{u.lastActive}</td>
                      <td style={tdStyle}>{u.topFeature}</td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: selectedUserId === u.id ? "#E65100" : "#C68B59",
                        }}>{selectedUserId === u.id ? "▲ Close" : "▼ Details"}</span>
                      </td>
                    </tr>
                  ))}
                  {userStats.length === 0 && (
                    <tr><td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#A1887F" }}>No user activity yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>

          {/* User Detail Drill-Down */}
          {selectedUserId && (
            <UserDetailPanel
              userId={selectedUserId}
              sessions={sessions}
              events={events}
              profiles={profiles}
              onClose={() => setSelectedUserId(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "18px 20px",
      boxShadow: "0 2px 12px rgba(44,24,16,0.06)", display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
        background: `${color}18`, color,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#2C1810" }}>{value}</div>
        <div style={{ fontSize: 12, color: "#8D6E63" }}>{label}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "18px 20px",
      boxShadow: "0 2px 12px rgba(44,24,16,0.06)",
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: "#2C1810", marginBottom: 14 }}>{title}</h3>
      {children}
    </div>
  );
}

function EmptyState() {
  return <div style={{ padding: 40, textAlign: "center", color: "#A1887F", fontSize: 13 }}>No data yet</div>;
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#F5F0EB", fontFamily: "'DM Sans', sans-serif", color: "#8D6E63",
    }}>Loading…</div>
  );
}

function UserDetailPanel({ userId, sessions, events, profiles, onClose }: {
  userId: string;
  sessions: SessionRow[];
  events: EventRow[];
  profiles: ProfileRow[];
  onClose: () => void;
}) {
  const user = profiles.find(p => p.id === userId);
  const userSessions = sessions.filter(s => s.user_id === userId).sort((a, b) => b.started_at.localeCompare(a.started_at));
  const userEvents = events.filter(e => e.user_id === userId);
  const featureEvents = userEvents.filter(e => e.event_type === "feature_use");
  const elaEvents = featureEvents.filter(e => e.event_name === "ela_chat");

  // Feature usage breakdown
  const featureCounts: Record<string, number> = {};
  featureEvents.forEach(e => {
    const label = FEATURE_LABELS[e.event_name] || e.event_name;
    featureCounts[label] = (featureCounts[label] || 0) + 1;
  });
  const featureData = Object.entries(featureCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Ela interaction summary (privacy-compliant)
  const totalElaMessages = elaEvents.length;
  const avgWordCount = elaEvents.length > 0
    ? Math.round(elaEvents.reduce((a, e) => a + (e.metadata?.word_count || 0), 0) / elaEvents.length)
    : 0;
  const maxConversationDepth = elaEvents.length > 0
    ? Math.max(...elaEvents.map(e => e.metadata?.message_index || 0))
    : 0;

  // Ela usage over time (by day)
  const elaByDay: Record<string, number> = {};
  elaEvents.forEach(e => {
    const day = e.created_at.slice(0, 10);
    elaByDay[day] = (elaByDay[day] || 0) + 1;
  });
  const elaTimeData = Object.entries(elaByDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date: date.slice(5), count }));

  return (
    <div style={{ marginTop: 20 }}>
      <ChartCard title="">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={onClose} style={{
            background: "#F5F0EB", border: "none", borderRadius: 8, padding: "6px 8px",
            cursor: "pointer", display: "flex", alignItems: "center",
          }}>
            <ArrowLeft size={16} color="#5D4037" />
          </button>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2C1810", margin: 0 }}>{user?.full_name || "Unknown"}</h2>
            <span style={{
              display: "inline-block", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600, marginTop: 4,
              background: user?.role === "parent" ? "#FFF3E0" : "#E8F5E9",
              color: user?.role === "parent" ? "#E65100" : "#2E7D32",
            }}>{ROLE_LABELS[user?.role || ""] || user?.role}</span>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#8D6E63" }}>
            {userSessions.length} sessions · {featureEvents.length} events
          </div>
        </div>

        {/* Summary Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MiniStat label="Total Sessions" value={userSessions.length} />
          <MiniStat label="Feature Events" value={featureEvents.length} />
          <MiniStat label="Ela Messages" value={totalElaMessages} />
          <MiniStat label="Avg Words/Message" value={avgWordCount} />
          <MiniStat label="Max Conv. Depth" value={maxConversationDepth} />
        </div>

        {/* Two-column: Features + Ela */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {/* Feature breakdown */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#5D4037", marginBottom: 10 }}>Feature Usage</h4>
            {featureData.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {featureData.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      flex: 1, height: 22, background: "#F5F0EB", borderRadius: 6, overflow: "hidden", position: "relative",
                    }}>
                      <div style={{
                        height: "100%", borderRadius: 6,
                        width: `${Math.max(8, (f.count / featureData[0].count) * 100)}%`,
                        background: `linear-gradient(90deg, #C68B59, #8D6E63)`,
                        transition: "width 0.3s",
                      }} />
                      <span style={{
                        position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                        fontSize: 11, fontWeight: 500, color: "#2C1810", zIndex: 1,
                      }}>{f.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#5D4037", minWidth: 28, textAlign: "right" }}>{f.count}</span>
                  </div>
                ))}
              </div>
            ) : <div style={{ color: "#A1887F", fontSize: 12 }}>No feature usage yet</div>}
          </div>

          {/* Ela interaction summary */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#5D4037", marginBottom: 10 }}>
              <MessageCircle size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
              Ela Interaction Summary
            </h4>
            {totalElaMessages > 0 ? (
              <>
                <div style={{ fontSize: 12, color: "#5D4037", lineHeight: 1.8, marginBottom: 12 }}>
                  <div>• Sent <strong>{totalElaMessages}</strong> messages to Ela</div>
                  <div>• Average <strong>{avgWordCount} words</strong> per message</div>
                  <div>• Deepest conversation: <strong>{maxConversationDepth} messages</strong> deep</div>
                  <div>• Active across <strong>{Object.keys(elaByDay).length} days</strong></div>
                </div>
                {elaTimeData.length > 1 && (
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={elaTimeData}>
                      <XAxis dataKey="date" fontSize={10} stroke="#A1887F" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#C68B59" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </>
            ) : <div style={{ color: "#A1887F", fontSize: 12 }}>No Ela interactions yet</div>}
          </div>
        </div>

        {/* Session Timeline */}
        <h4 style={{ fontSize: 13, fontWeight: 600, color: "#5D4037", marginBottom: 10 }}>Session Timeline</h4>
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {userSessions.map((s, i) => {
            const sessionEvents = userEvents
              .filter(e => e.session_id === s.id)
              .sort((a, b) => a.created_at.localeCompare(b.created_at));
            const started = new Date(s.started_at);
            return (
              <div key={s.id} style={{
                padding: "10px 14px", borderRadius: 12, marginBottom: 8,
                background: i % 2 === 0 ? "#FAFAF8" : "#fff",
                border: "1px solid #f0e8e0",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#2C1810" }}>
                    {started.toLocaleDateString()} · {started.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span style={{ fontSize: 11, color: "#8D6E63" }}>
                    {sessionEvents.length} events
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {sessionEvents.map((e, j) => (
                    <span key={j} style={{
                      fontSize: 10, padding: "2px 7px", borderRadius: 6, fontWeight: 500,
                      background: e.event_type === "page_view" ? "#E3F2FD" : e.event_name === "ela_chat" ? "#F3E5F5" : "#FFF3E0",
                      color: e.event_type === "page_view" ? "#1565C0" : e.event_name === "ela_chat" ? "#7B1FA2" : "#E65100",
                    }}>
                      {e.event_type === "page_view" ? e.event_name : (FEATURE_LABELS[e.event_name] || e.event_name)}
                    </span>
                  ))}
                  {sessionEvents.length === 0 && (
                    <span style={{ fontSize: 11, color: "#A1887F" }}>No events recorded</span>
                  )}
                </div>
              </div>
            );
          })}
          {userSessions.length === 0 && (
            <div style={{ color: "#A1887F", fontSize: 12, textAlign: "center", padding: 20 }}>No sessions yet</div>
          )}
        </div>
      </ChartCard>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: "#FAFAF8", borderRadius: 10, padding: "10px 14px",
      border: "1px solid #f0e8e0",
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#2C1810" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#8D6E63" }}>{label}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "10px 12px", fontWeight: 600, color: "#5D4037", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" };
const tdStyle: React.CSSProperties = { padding: "10px 12px", color: "#2C1810" };
