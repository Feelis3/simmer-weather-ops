"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import TradesTimeline from "@/components/TradesTimeline";
import LeaderboardCard from "@/components/LeaderboardCard";
import { BOTS } from "@/lib/constants";
import { OWNERS, OWNER_IDS, type OwnerId } from "@/lib/owners";
import type {
  StatusResponse, TradesResponse, LeaderboardData, CronsResponse, Position, Trade,
} from "@/lib/types";

// ─── City map coordinates (equirectangular, 1000×500 viewport) ──────────────
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  "NYC":     { lat: 40.7,  lon: -74.0  },
  "Chicago": { lat: 41.9,  lon: -87.6  },
  "Atlanta": { lat: 33.7,  lon: -84.4  },
  "Dallas":  { lat: 32.8,  lon: -96.8  },
  "Miami":   { lat: 25.8,  lon: -80.2  },
  "London":  { lat: 51.5,  lon: -0.1   },
  "Seoul":   { lat: 37.6,  lon: 127.0  },
  "Toronto": { lat: 43.7,  lon: -79.4  },
  "Paris":   { lat: 48.9,  lon: 2.3    },
  "Tokyo":   { lat: 35.7,  lon: 139.7  },
  "Sydney":  { lat: -33.9, lon: 151.2  },
};

function latLonToXY(lat: number, lon: number) {
  return { x: (lon + 180) * (1000 / 360), y: (90 - lat) * (500 / 180) };
}

// ─── State ───────────────────────────────────────────────────────────────────
interface DashboardState {
  status: StatusResponse | null;
  trades: TradesResponse | null;
  leaderboard: LeaderboardData | null;
  crons: CronsResponse | null;
  error: string | null;
  offline: boolean;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OwnerDashboard({ params }: { params: Promise<{ owner: string }> }) {
  const { owner } = use(params);
  if (!OWNER_IDS.includes(owner as OwnerId)) notFound();
  const ownerId = owner as OwnerId;
  const ownerConfig = OWNERS[ownerId];
  const prefix = `/api/bots/${ownerId}`;

  const [state, setState] = useState<DashboardState>({
    status: null, trades: null, leaderboard: null,
    crons: null, error: null, offline: false,
  });
  const [paused, setPaused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const router = useRouter();

  const fetchFast = useCallback(async () => {
    const res = await fetch(`${prefix}/crons`).then(r => r.json()).catch(() => null);
    setState(prev => ({ ...prev, crons: res && !res.error ? res : prev.crons }));
  }, [prefix]);

  const fetchSlow = useCallback(async () => {
    const [statusRes, tradesRes, lbRes] = await Promise.allSettled([
      fetch(`${prefix}/status`).then(r => r.json()),
      fetch(`${prefix}/trades`).then(r => r.json()),
      fetch("/api/leaderboard").then(r => r.json()),
    ]);
    setState(prev => {
      const sv = statusRes.status === "fulfilled" ? statusRes.value : null;
      const offline = sv?.offline === true;
      return {
        ...prev,
        status: sv && !offline && !sv.error ? sv as StatusResponse : prev.status,
        trades: tradesRes.status === "fulfilled" && !tradesRes.value.error ? tradesRes.value : prev.trades,
        leaderboard: lbRes.status === "fulfilled" && !lbRes.value.error ? lbRes.value : prev.leaderboard,
        error: sv?.error && !offline ? sv.error : prev.error,
        offline,
      };
    });
    setLastUpdated(new Date());
  }, [prefix]);

  const fetchAll = useCallback(async () => {
    try { fetchFast(); await fetchSlow(); }
    catch (e) { setState(prev => ({ ...prev, error: String(e) })); }
  }, [fetchFast, fetchSlow]);

  useEffect(() => {
    fetchFast(); fetchSlow();
    timerRef.current = setInterval(fetchAll, 30000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchFast, fetchSlow, fetchAll, prefix]);

  const handleToggle = async (enabled: boolean) => {
    await fetch(`${prefix}/toggle/weather`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    fetchAll();
  };
  const handleRun = async () => {
    await fetch(`${prefix}/run/weather`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    setTimeout(fetchAll, 2000);
  };
  const handlePause = async () => {
    const np = !paused;
    await fetch("/api/pause", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paused: np }),
    });
    setPaused(np); fetchAll();
  };
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true); await fetchAll(); setIsRefreshing(false);
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const portfolio = state.status?.portfolio;
  const account   = state.status?.account;
  const positions: Position[] = (state.status?.positions?.positions ?? [])
    .filter(p => p.venue === "polymarket");
  const trades: Trade[] = (state.trades?.trades ?? [])
    .filter(t => t.venue === "polymarket");
  const weatherActive = state.crons?.bots?.weather?.active ?? false;
  const c = ownerConfig.color;

  const winLossData = [
    { name: "Wins",   value: account?.win_count  ?? 0, color: "#4ade80" },
    { name: "Losses", value: account?.loss_count ?? 0, color: "#f87171" },
  ];

  const posChartData = positions
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 12)
    .map(p => ({
      name: p.question.length > 32 ? p.question.slice(0, 32) + "…" : p.question,
      pnl:  parseFloat(p.pnl.toFixed(2)),
      fill: p.pnl >= 0 ? "#4ade80" : "#f87171",
    }));

  const tradesByDay = (() => {
    const g: Record<string, { B: number; S: number }> = {};
    trades.slice(-150).forEach(t => {
      const d = t.created_at.slice(5, 10);
      if (!g[d]) g[d] = { B: 0, S: 0 };
      if (t.action.toLowerCase() === "buy") g[d].B += t.cost;
      else g[d].S += t.cost;
    });
    return Object.entries(g).slice(-10).map(([date, v]) => ({
      date,
      Buys:  parseFloat(v.B.toFixed(1)),
      Sells: parseFloat(v.S.toFixed(1)),
    }));
  })();

  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);

  return (
    <div className="min-h-screen bg-bg text-text-primary">

      {/* ── Sub-header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-border" style={{ background: "rgba(5,9,26,0.92)" }}>
        <div className="max-w-[1440px] mx-auto px-5 h-10 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xl leading-none">{ownerConfig.emoji}</span>
            <span className="text-sm font-bold text-text-primary">{ownerConfig.name}</span>
            <span className="label-xs" style={{ color: c + "70" }}>{ownerConfig.type}</span>
            {state.offline ? (
              <span className="pill text-[0.45rem]" style={{ background: "#1b2d4a", color: "#92adc9" }}>PENDING</span>
            ) : state.error ? (
              <span className="pill text-[0.45rem]" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>ERROR</span>
            ) : state.status ? (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse-neon" style={{ background: c }} />
                <span className="text-[0.45rem] font-black tracking-widest" style={{ color: c }}>LIVE</span>
              </div>
            ) : null}
            <div className="hidden md:flex items-center gap-5 ml-2 pl-2 border-l border-border">
              <StatChip label="Balance"   value={`$${(portfolio?.balance_usdc ?? 0).toFixed(2)}`} color={c} />
              <StatChip label="Exposure"  value={`$${(portfolio?.total_exposure ?? 0).toFixed(2)}`} color="#f59e0b" />
              <StatChip label="Positions" value={String(positions.length)} color="#a78bfa" />
              <LeaderboardCard data={state.leaderboard} />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleRefresh} disabled={isRefreshing}
              className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30">
              <svg width="11" height="11" viewBox="0 0 13 13" fill="none"
                className={isRefreshing ? "animate-spin-refresh" : ""}>
                <path d="M12 6.5A5.5 5.5 0 1 1 6.5 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M12 1v5.5H6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {lastUpdated && !isRefreshing && (
                <span className="text-[0.45rem] tabular-nums hidden sm:block" style={{ color: "#6b80a0" }}>
                  {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </button>
            <div className="w-px h-3 bg-border" />
            <button onClick={handlePause} className="pill text-[0.5rem] transition-all"
              style={paused
                ? { background: "rgba(248,113,113,0.1)", color: "#f87171" }
                : { background: c + "12", color: c }}>
              {paused ? "Resume" : "Pause"}
            </button>
            <button onClick={handleLogout}
              className="text-[0.5rem] font-semibold tracking-wider uppercase transition-colors"
              style={{ color: "#6b80a0" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
              onMouseLeave={e => (e.currentTarget.style.color = "#6b80a0")}>
              Exit
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-5 py-6 space-y-5">

        {/* Offline / Error */}
        {state.offline && (
          <div className="rounded-2xl p-10 text-center"
            style={{ background: "#0b1229", border: "1px solid #1b2d4a" }}>
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-base font-bold mb-1">{ownerConfig.name}&apos;s bot is not configured yet</p>
            <p className="text-xs text-text-secondary">
              Set <span className="font-mono" style={{ color: c }}>BOT_{ownerId.toUpperCase()}_API_KEY</span> in .env.local
            </p>
          </div>
        )}
        {state.error && !state.offline && (
          <div className="rounded-xl px-4 py-3 text-xs"
            style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.2)" }}>
            <span className="font-bold" style={{ color: "#f87171" }}>VPS Error — </span>
            <span style={{ color: "rgba(248,113,113,0.6)" }}>{state.error}</span>
          </div>
        )}

        {!state.offline && (
          <>
            {/* ── Row 1: 4 stat cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <BigStat label="Balance"        value={`$${(portfolio?.balance_usdc ?? 0).toFixed(2)}`}           color={c}        loading={!state.status} />
              <BigStat label="Exposure"       value={`$${(portfolio?.total_exposure ?? 0).toFixed(2)}`}          color="#f59e0b"  loading={!state.status} />
              <BigStat label="Open Positions" value={String(positions.length)}                                    color="#a78bfa"  loading={!state.status} />
              <BigStat
                label="Win Rate"
                value={account?.win_rate != null ? `${(account.win_rate * 100).toFixed(0)}%` : "—"}
                sub={account ? `${account.win_count ?? 0}W · ${account.loss_count ?? 0}L` : undefined}
                color={c} loading={!state.status}
              />
            </div>

            {/* ── Row 2: Weather Bot | Win/Loss | Trade Activity ───────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Weather bot card */}
              <div className="card p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                      style={{ background: BOTS.weather.color + "15", border: `1px solid ${BOTS.weather.color}25` }}>
                      {BOTS.weather.emoji}
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: BOTS.weather.color }}>Weather Bot</div>
                      <div className="text-[0.55rem] text-text-secondary mt-0.5">{BOTS.weather.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 shrink-0">
                    <div className={`w-2 h-2 rounded-full ${weatherActive ? "animate-pulse-neon" : ""}`}
                      style={{ background: weatherActive ? "#4ade80" : "#f87171" }} />
                    <span className="text-[0.5rem] font-black tracking-widest"
                      style={{ color: weatherActive ? "#4ade80" : "#f87171" }}>
                      {weatherActive ? "LIVE" : "OFF"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ownerConfig.cities.map(city => (
                    <span key={city} className="text-[0.55rem] px-2.5 py-1 rounded-lg font-mono font-semibold"
                      style={{ background: c + "12", color: c + "aa", border: `1px solid ${c}20` }}>
                      {city}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                  <div>
                    <div className="label-xs mb-1">Total P&L</div>
                    <div className="text-lg font-bold tabular-nums"
                      style={{ color: (account?.total_pnl ?? 0) >= 0 ? "#4ade80" : "#f87171" }}>
                      {account != null
                        ? `${account.total_pnl >= 0 ? "+" : ""}$${account.total_pnl.toFixed(2)}`
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="label-xs mb-1">Total Trades</div>
                    <div className="text-lg font-bold tabular-nums" style={{ color: "#22d3ee" }}>
                      {account?.trades_count ?? "—"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => handleToggle(!weatherActive)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={weatherActive
                      ? { background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }
                      : { background: "rgba(74,222,128,0.08)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>
                    {weatherActive ? "⏹ Disable" : "▶ Enable"}
                  </button>
                  <button onClick={handleRun}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={{ background: "rgba(34,211,238,0.08)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.2)" }}>
                    ⚡ Run Now
                  </button>
                </div>
              </div>

              {/* Win/Loss donut */}
              <div className="card p-5 flex flex-col">
                <h3 className="text-xs font-semibold tracking-wide text-text-secondary mb-3">Trade Results</h3>
                {(account?.win_count ?? 0) + (account?.loss_count ?? 0) > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={165}>
                      <PieChart>
                        <Pie data={winLossData} cx="50%" cy="50%"
                          innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                          {winLossData.map((e, i) => <Cell key={i} fill={e.color} opacity={0.85} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#0b1229", border: "1px solid #1b2d4a", borderRadius: 8, fontSize: 11 }}
                          labelStyle={{ color: "#92adc9" }} itemStyle={{ color: "#f1f5f9" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-8 mt-3">
                      {winLossData.map(d => (
                        <div key={d.name} className="text-center">
                          <div className="text-xl font-bold tabular-nums" style={{ color: d.color }}>{d.value}</div>
                          <div className="label-xs mt-0.5">{d.name}</div>
                        </div>
                      ))}
                      <div className="text-center">
                        <div className="text-xl font-bold tabular-nums" style={{ color: c }}>
                          {account?.win_rate != null ? `${(account.win_rate * 100).toFixed(0)}%` : "—"}
                        </div>
                        <div className="label-xs mt-0.5">Win Rate</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-text-muted">No trade data yet</div>
                )}
              </div>

              {/* Daily trade activity */}
              <div className="card p-5 flex flex-col">
                <h3 className="text-xs font-semibold tracking-wide text-text-secondary mb-3">
                  Trade Activity · last 10 days
                </h3>
                {tradesByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={195}>
                    <BarChart data={tradesByDay} barSize={9} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1b2d4a" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "#6b80a0", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#6b80a0", fontSize: 9 }} axisLine={false} tickLine={false}
                        width={34} tickFormatter={v => `$${v}`} />
                      <Tooltip contentStyle={{ background: "#0b1229", border: "1px solid #1b2d4a", borderRadius: 8, fontSize: 11 }}
                        labelStyle={{ color: "#92adc9" }} itemStyle={{ color: "#f1f5f9" }} />
                      <Bar dataKey="Buys"  fill="#f87171" opacity={0.8} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Sells" fill="#4ade80" opacity={0.8} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-text-muted">No trade history</div>
                )}
              </div>
            </div>

            {/* ── Row 3: Positions P&L bar | World map ────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Horizontal P&L bar chart */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold tracking-wide text-text-secondary">Position P&L Breakdown</h3>
                  {positions.length > 0 && (
                    <span className="text-sm font-bold tabular-nums"
                      style={{ color: totalPnl >= 0 ? "#4ade80" : "#f87171" }}>
                      {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
                    </span>
                  )}
                </div>
                {posChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(180, posChartData.length * 30)}>
                    <BarChart layout="vertical" data={posChartData} barSize={11}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1b2d4a" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#6b80a0", fontSize: 9 }} axisLine={false}
                        tickLine={false} tickFormatter={v => `$${v}`} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#92adc9", fontSize: 9 }}
                        axisLine={false} tickLine={false} width={135} />
                      <Tooltip contentStyle={{ background: "#0b1229", border: "1px solid #1b2d4a", borderRadius: 8, fontSize: 11 }}
                        formatter={(v: number | undefined) => [`$${v ?? 0}`, "P&L"]}
                        labelStyle={{ color: "#92adc9" }} itemStyle={{ color: "#f1f5f9" }} />
                      <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                        {posChartData.map((e, i) => <Cell key={i} fill={e.fill} opacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-44 flex items-center justify-center text-xs text-text-muted">No open positions</div>
                )}
              </div>

              {/* World map */}
              <CityMap cities={ownerConfig.cities} positions={positions} color={c} isOnline={!!state.status} />
            </div>

            {/* ── Row 4: Trades timeline ──────────────────────────────────── */}
            {trades.length > 0 && <TradesTimeline trades={trades} />}
          </>
        )}
      </main>

      <footer className="border-t border-border mt-8 py-4" style={{ background: "rgba(5,9,26,0.6)" }}>
        <div className="max-w-[1440px] mx-auto px-5 flex items-center justify-between">
          <span className="label-xs" style={{ color: "#6b80a0" }}>{ownerConfig.name} · auto-refresh 30s</span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-neon" style={{ background: c }} />
            <span className="text-[0.5rem] tabular-nums" style={{ color: "#6b80a0" }}>
              {state.status?.timestamp ? new Date(state.status.timestamp).toLocaleTimeString() : "---"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── CityMap ──────────────────────────────────────────────────────────────────
function CityMap({ cities, positions, color, isOnline }: {
  cities: string[];
  positions: Position[];
  color: string;
  isOnline: boolean;
}) {
  const cityPnl   = (city: string) =>
    positions.filter(p => p.question.toLowerCase().includes(city.toLowerCase()))
      .reduce((s, p) => s + p.pnl, 0);
  const cityCount = (city: string) =>
    positions.filter(p => p.question.toLowerCase().includes(city.toLowerCase())).length;

  return (
    <div className="card p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold tracking-wide text-text-secondary">Coverage Zones</h3>
        <div className="flex items-center gap-3 text-[0.55rem] text-text-secondary">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#4ade80" }} />Profit</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#f87171" }} />Loss</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />Active</span>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#05091a" }}>
        <svg viewBox="0 0 1000 500" className="w-full" xmlns="http://www.w3.org/2000/svg">
          {/* Grid */}
          {[0,1,2,3,4].map(i => (
            <line key={`h${i}`} x1="0" y1={i * 125} x2="1000" y2={i * 125} stroke="#1b2d4a" strokeWidth="0.6" />
          ))}
          {[0,1,2,3,4,5,6].map(i => (
            <line key={`v${i}`} x1={i * 166.7} y1="0" x2={i * 166.7} y2="500" stroke="#1b2d4a" strokeWidth="0.6" />
          ))}

          {/* Continents */}
          <polygon points="38,72 80,52 212,48 298,76 350,74 360,116 332,124 305,128 298,134 292,148 280,169 270,183 248,214 193,196 155,160 150,114 62,94" fill="#0b1229" stroke="#1b2d4a" strokeWidth="0.8" />
          <polygon points="319,19 444,19 448,80 362,82" fill="#0b1229" stroke="#1b2d4a" strokeWidth="0.8" />
          <polygon points="248,214 285,225 328,219 402,258 405,310 385,360 348,395 315,408 290,390 270,353 268,308 275,265" fill="#0b1229" stroke="#1b2d4a" strokeWidth="0.8" />
          <polygon points="456,165 466,148 466,126 476,108 474,92 490,82 510,72 528,66 542,58 558,52 580,50 602,58 620,76 622,100 618,118 608,133 591,143 573,146 556,145 543,158 528,168 510,168 493,162" fill="#0b1229" stroke="#1b2d4a" strokeWidth="0.8" />
          <polygon points="460,165 493,162 510,168 540,165 573,146 591,143 620,148 630,172 630,213 616,256 600,296 570,345 532,383 500,390 468,366 444,313 436,263 449,213 452,175" fill="#0b1229" stroke="#1b2d4a" strokeWidth="0.8" />
          <polygon points="572,136 603,94 617,61 667,53 750,46 850,50 950,62 994,69 970,95 940,115 920,138 906,152 880,158 858,172 840,196 820,222 790,225 764,218 740,208 718,228 698,228 680,210 660,192 636,182 625,153 617,133 600,150" fill="#0b1229" stroke="#1b2d4a" strokeWidth="0.8" />
          <polygon points="817,272 925,278 919,342 903,356 819,344" fill="#0b1229" stroke="#1b2d4a" strokeWidth="0.8" />
          <polygon points="878,120 892,130 886,150 876,148 878,130" fill="#0b1229" stroke="#1b2d4a" strokeWidth="0.8" />
          <polygon points="968,352 977,360 972,370 965,363" fill="#0b1229" stroke="#1b2d4a" strokeWidth="0.6" />

          {/* City markers */}
          {cities.map(city => {
            const coords = CITY_COORDS[city];
            if (!coords) return null;
            const { x, y } = latLonToXY(coords.lat, coords.lon);
            const pnl   = cityPnl(city);
            const count = cityCount(city);
            const dot   = !isOnline ? "#6b80a0"
              : count > 0 ? (pnl >= 0 ? "#4ade80" : "#f87171")
              : color;
            const r = count > 0 ? Math.min(5 + count * 1.2, 9) : 4.5;
            return (
              <g key={city}>
                {isOnline && <circle cx={x} cy={y} r={r + 7} fill={dot} opacity="0.1" />}
                <circle cx={x} cy={y} r={r} fill={dot} opacity="0.92" />
                <circle cx={x - r * 0.28} cy={y - r * 0.28} r={r * 0.32} fill="white" opacity="0.28" />
                <text x={x} y={y + r + 11} textAnchor="middle"
                  fill={dot} fontSize="9" fontWeight="600" fontFamily="Inter, sans-serif" opacity="0.9">
                  {city}
                </text>
                {count > 0 && (
                  <text x={x} y={y - r - 4} textAnchor="middle"
                    fill={pnl >= 0 ? "#4ade80" : "#f87171"}
                    fontSize="8" fontWeight="700" fontFamily="monospace" opacity="0.95">
                    {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* City pills */}
      <div className="flex flex-wrap gap-2 mt-3">
        {cities.map(city => {
          const pnl   = cityPnl(city);
          const count = cityCount(city);
          const dot   = !isOnline ? "#6b80a0"
            : count > 0 ? (pnl >= 0 ? "#4ade80" : "#f87171")
            : color;
          return (
            <div key={city} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.55rem]"
              style={{ background: "#05091a", border: "1px solid #1b2d4a" }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
              <span className="font-mono font-semibold" style={{ color: "#92adc9" }}>{city}</span>
              {count > 0 && (
                <>
                  <span className="font-bold tabular-nums" style={{ color: dot }}>
                    {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}
                  </span>
                  <span className="text-text-muted">· {count}p</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BigStat ──────────────────────────────────────────────────────────────────
function BigStat({ label, value, sub, color, loading }: {
  label: string; value: string; sub?: string; color: string; loading?: boolean;
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#0b1229", border: "1px solid #1b2d4a" }}>
      <div className="label-xs mb-2">{label}</div>
      {loading
        ? <div className="skeleton h-7 w-28 rounded-lg" />
        : <div className="stat-xl tabular-nums animate-number" style={{ color }}>{value}</div>
      }
      {sub && <div className="text-[0.5rem] mt-1" style={{ color: "#6b80a0" }}>{sub}</div>}
    </div>
  );
}

// ─── StatChip ─────────────────────────────────────────────────────────────────
function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="label-xs">{label}</span>
      <span className="text-[0.65rem] font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}
