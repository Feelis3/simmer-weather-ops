"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import TradesTimeline from "@/components/TradesTimeline";
import LeaderboardCard from "@/components/LeaderboardCard";
import { BOTS } from "@/lib/constants";
import { OWNERS, OWNER_IDS, type OwnerId } from "@/lib/owners";
import type {
  StatusResponse, TradesResponse, LeaderboardData, CronsResponse, Position, Trade,
} from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function cityPnl(city: string, positions: Position[]) {
  return positions
    .filter(p => p.question.toLowerCase().includes(city.toLowerCase()))
    .reduce((s, p) => s + p.pnl, 0);
}
function cityBets(city: string, positions: Position[]) {
  return positions.filter(p => p.question.toLowerCase().includes(city.toLowerCase())).length;
}
function cityAvgPrice(city: string, positions: Position[]) {
  const ps = positions.filter(p => p.question.toLowerCase().includes(city.toLowerCase()));
  if (!ps.length) return null;
  return ps.reduce((s, p) => s + p.current_price, 0) / ps.length;
}

// ─── State ────────────────────────────────────────────────────────────────────
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

  // ── Derived data ─────────────────────────────────────────────────────────────
  const portfolio    = state.status?.portfolio;
  const account      = state.status?.account;
  const positions: Position[] = (state.status?.positions?.positions ?? [])
    .filter(p => p.venue === "polymarket" && p.current_value > 0.01);
  const trades: Trade[] = (state.trades?.trades ?? [])
    .filter(t => t.venue === "polymarket");
  const weatherActive = state.crons?.bots?.weather?.active ?? false;
  const c = ownerConfig.color;

  const balance  = portfolio?.balance_usdc ?? 0;
  const exposure = portfolio?.total_exposure ?? 0;
  const openPnl  = positions.reduce((s, p) => s + p.pnl, 0);

  return (
    <div className="min-h-screen bg-bg text-text-primary">

      {/* ── Sub-header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-border" style={{ background: "rgba(5,9,26,0.92)" }}>
        <div className="max-w-[1440px] mx-auto px-5 h-11 flex items-center justify-between gap-6">
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
              <StatChip label="Balance"   value={`$${balance.toFixed(2)}`}  color={c} />
              <StatChip label="Exposure"  value={`$${exposure.toFixed(2)}`} color="#f59e0b" />
              <StatChip label="Positions" value={String(positions.length)}  color="#a78bfa" />
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

        {/* ── Offline / Error states ───────────────────────────────────────── */}
        {state.offline && (
          <div className="rounded-2xl p-12 text-center"
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
            {/* ── Row 1: Four key stats ────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <BigStat label="Balance" value={`$${balance.toFixed(2)}`}
                sub="USDC wallet" color={c} loading={!state.status} />
              <BigStat label="Exposure" value={`$${exposure.toFixed(2)}`}
                sub="at risk in markets" color="#f59e0b" loading={!state.status} />
              <BigStat label="Open Positions" value={String(positions.length)}
                sub={positions.length > 0 ? `Open P&L: ${openPnl >= 0 ? "+" : ""}$${openPnl.toFixed(2)}` : "No open positions"}
                color="#a78bfa" loading={!state.status} />
              <BigStat label="Total Trades" value={account?.trades_count != null ? String(account.trades_count) : "—"}
                sub={account ? `${account.win_count ?? 0} wins · ${account.loss_count ?? 0} losses` : undefined}
                color={c} loading={!state.status} />
            </div>

            {/* ── Row 2: Positions table ───────────────────────────────────── */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-bold text-text-primary">Open Positions</h3>
                  {positions.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[0.5rem] font-bold"
                      style={{ background: "#a78bfa20", color: "#a78bfa" }}>
                      {positions.length}
                    </span>
                  )}
                </div>
                {positions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="label-xs">Open P&L</span>
                    <span className="text-sm font-bold tabular-nums"
                      style={{ color: openPnl >= 0 ? "#4ade80" : "#f87171" }}>
                      {openPnl >= 0 ? "+" : ""}${openPnl.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {positions.length === 0 ? (
                <div className="h-24 flex items-center justify-center">
                  {state.status
                    ? <span className="text-xs text-text-muted">No open positions</span>
                    : <div className="skeleton h-4 w-40 rounded" />}
                </div>
              ) : (
                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1b2d4a" }}>
                        {["Market","Side","Price","Shares","Cost Basis","Curr. Value","P&L","Expires"].map(h => (
                          <th key={h} className="pb-2.5 text-left pr-3"
                            style={{ color: "#6b80a0", fontSize: "0.5rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {positions
                        .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
                        .map((pos, i) => {
                          const isYes   = (pos.shares_yes ?? 0) > 0;
                          const shares  = isYes ? pos.shares_yes : pos.shares_no;
                          const pnlPos  = pos.pnl >= 0;
                          const expires = pos.resolves_at
                            ? new Date(pos.resolves_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "—";
                          return (
                            <tr key={pos.market_id ?? i} className="transition-colors"
                              style={{ borderBottom: "1px solid #1b2d4a1a" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#0f1d35")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              <td className="py-3 pr-4">
                                <span className="text-xs font-medium leading-snug text-text-primary" title={pos.question}
                                  style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                  {pos.question}
                                </span>
                                {pos.redeemable && (
                                  <span className="inline-block mt-1 text-[0.45rem] px-1.5 py-0.5 rounded font-bold"
                                    style={{ background: "rgba(3,231,139,0.1)", color: "#03E78B" }}>REDEEMABLE</span>
                                )}
                              </td>
                              <td className="py-3 pr-3">
                                <span className="px-2 py-0.5 rounded text-[0.5rem] font-bold"
                                  style={isYes
                                    ? { background: "rgba(74,222,128,0.12)", color: "#4ade80" }
                                    : { background: "rgba(248,113,113,0.12)", color: "#f87171" }}>
                                  {isYes ? "YES" : "NO"}
                                </span>
                              </td>
                              <td className="py-3 pr-3 tabular-nums font-mono text-xs font-semibold" style={{ color: "#22d3ee" }}>
                                {(pos.current_price * 100).toFixed(0)}¢
                              </td>
                              <td className="py-3 pr-3 tabular-nums font-mono text-xs" style={{ color: "#92adc9" }}>
                                {(shares ?? 0).toFixed(0)}
                              </td>
                              <td className="py-3 pr-3 tabular-nums font-mono text-xs" style={{ color: "#6b80a0" }}>
                                ${pos.cost_basis.toFixed(2)}
                              </td>
                              <td className="py-3 pr-3 tabular-nums font-mono text-xs font-semibold" style={{ color: "#dde8ff" }}>
                                ${pos.current_value.toFixed(2)}
                              </td>
                              <td className="py-3 pr-3 tabular-nums font-mono text-xs font-bold"
                                style={{ color: pnlPos ? "#4ade80" : "#f87171" }}>
                                {pnlPos ? "+" : ""}${pos.pnl.toFixed(2)}
                              </td>
                              <td className="py-3 text-[0.55rem] tabular-nums" style={{ color: "#6b80a0" }}>
                                {expires}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Row 3: Positions Breakdown | Recent Trades | Weather Bot ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <PnlBreakdown positions={positions} openPnl={openPnl} color={c} loaded={!!state.status} />
              <TradeFeed trades={trades} color={c} loaded={!!state.trades} />

              {/* Weather bot controls */}
              <div className="card p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ background: BOTS.weather.color + "15", border: `1px solid ${BOTS.weather.color}25` }}>
                      {BOTS.weather.emoji}
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: BOTS.weather.color }}>Weather Bot</div>
                      <div className="text-[0.55rem] text-text-secondary mt-0.5">{BOTS.weather.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 shrink-0">
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
                    <span key={city} className="text-[0.5rem] px-2 py-0.5 rounded font-mono font-semibold"
                      style={{ background: c + "10", color: c + "90", border: `1px solid ${c}15` }}>
                      {city}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                  <div>
                    <div className="label-xs mb-1">Open P&L</div>
                    <div className="text-lg font-bold tabular-nums"
                      style={{ color: openPnl >= 0 ? "#4ade80" : "#f87171" }}>
                      {positions.length > 0 ? `${openPnl >= 0 ? "+" : ""}$${openPnl.toFixed(2)}` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="label-xs mb-1">Total Trades</div>
                    <div className="text-lg font-bold tabular-nums" style={{ color: "#22d3ee" }}>
                      {account?.trades_count ?? "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button onClick={() => handleToggle(!weatherActive)}
                    className="py-2 rounded-lg text-[0.6rem] font-bold transition-all"
                    style={weatherActive
                      ? { background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }
                      : { background: "rgba(74,222,128,0.08)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>
                    {weatherActive ? "⏹ Disable" : "▶ Enable"}
                  </button>
                  <button onClick={handleRun}
                    className="py-2 rounded-lg text-[0.6rem] font-bold transition-all"
                    style={{ background: "rgba(34,211,238,0.08)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.2)" }}>
                    ⚡ Run Now
                  </button>
                </div>
              </div>
            </div>

            {/* ── Row 4: City Monitor ──────────────────────────────────────── */}
            <CityMonitor cities={ownerConfig.cities} positions={positions} color={c} isOnline={!!state.status} />

            {/* ── Row 5: Trades timeline ───────────────────────────────────── */}
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

// ─── PnlBreakdown ─────────────────────────────────────────────────────────────
function PnlBreakdown({ positions, openPnl, color, loaded }: {
  positions: Position[]; openPnl: number; color: string; loaded: boolean;
}) {
  const yesBets    = positions.filter(p => (p.shares_yes ?? 0) > 0);
  const noBets     = positions.filter(p => (p.shares_no  ?? 0) > 0);
  const yesPnl     = yesBets.reduce((s, p) => s + p.pnl, 0);
  const noPnl      = noBets.reduce((s, p) => s + p.pnl, 0);
  const profitable = positions.filter(p => p.pnl > 0).length;
  const under      = positions.filter(p => p.pnl < 0).length;
  const totalCost  = positions.reduce((s, p) => s + p.cost_basis, 0);
  const totalVal   = positions.reduce((s, p) => s + p.current_value, 0);
  const pct        = totalCost > 0 ? ((totalVal - totalCost) / totalCost * 100) : 0;

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-text-secondary">Positions Breakdown</h3>
        {loaded && positions.length > 0 && (
          <span className="text-[0.5rem] font-bold tabular-nums px-2 py-0.5 rounded"
            style={{ background: (pct >= 0 ? "#4ade80" : "#f87171") + "15",
                     color:      (pct >= 0 ? "#4ade80" : "#f87171") }}>
            {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
          </span>
        )}
      </div>

      {!loaded ? (
        <div className="flex-1 flex flex-col gap-3">
          <div className="skeleton h-10 w-32 rounded" />
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-3/4 rounded" />
        </div>
      ) : positions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6">
          <span className="text-2xl opacity-40">📭</span>
          <span className="text-xs text-text-muted">No open positions</span>
        </div>
      ) : (
        <>
          {/* Open P&L hero */}
          <div>
            <div className="label-xs mb-1">Open P&L</div>
            <div className="text-3xl font-bold tabular-nums"
              style={{ color: openPnl >= 0 ? "#4ade80" : "#f87171" }}>
              {openPnl >= 0 ? "+" : ""}${openPnl.toFixed(2)}
            </div>
            <div className="text-[0.5rem] mt-1 tabular-nums" style={{ color: "#6b80a0" }}>
              ${totalVal.toFixed(2)} current · ${totalCost.toFixed(2)} cost basis
            </div>
          </div>

          {/* Value bar */}
          <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "#1b2d4a" }}>
            <div className="absolute inset-y-0 left-0 rounded-full transition-all"
              style={{
                width: `${Math.min(100, totalCost > 0 ? (totalVal / totalCost) * 100 : 0)}%`,
                background: openPnl >= 0 ? "#4ade80" : "#f87171",
              }} />
          </div>

          {/* YES / NO split */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2.5" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.12)" }}>
              <div className="text-[0.45rem] font-bold tracking-widest mb-1" style={{ color: "#4ade80" }}>YES BETS</div>
              <div className="text-sm font-bold tabular-nums" style={{ color: "#4ade80" }}>
                {yesBets.length} <span className="text-[0.6rem] font-normal" style={{ color: "#4ade8080" }}>positions</span>
              </div>
              {yesBets.length > 0 && (
                <div className="text-[0.55rem] tabular-nums mt-0.5"
                  style={{ color: yesPnl >= 0 ? "#4ade80" : "#f87171" }}>
                  {yesPnl >= 0 ? "+" : ""}${yesPnl.toFixed(2)}
                </div>
              )}
            </div>
            <div className="rounded-lg p-2.5" style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.12)" }}>
              <div className="text-[0.45rem] font-bold tracking-widest mb-1" style={{ color: "#f87171" }}>NO BETS</div>
              <div className="text-sm font-bold tabular-nums" style={{ color: "#f87171" }}>
                {noBets.length} <span className="text-[0.6rem] font-normal" style={{ color: "#f8717180" }}>positions</span>
              </div>
              {noBets.length > 0 && (
                <div className="text-[0.55rem] tabular-nums mt-0.5"
                  style={{ color: noPnl >= 0 ? "#4ade80" : "#f87171" }}>
                  {noPnl >= 0 ? "+" : ""}${noPnl.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* Win/Loss counts */}
          {(profitable + under) > 0 && (
            <div className="flex items-center gap-2 text-[0.5rem]" style={{ color: "#6b80a0" }}>
              <span className="font-semibold" style={{ color: "#4ade80" }}>▲ {profitable} winning</span>
              <span>·</span>
              <span className="font-semibold" style={{ color: "#f87171" }}>▼ {under} losing</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── TradeFeed ────────────────────────────────────────────────────────────────
function TradeFeed({ trades, color, loaded }: {
  trades: Trade[]; color: string; loaded: boolean;
}) {
  const recent = trades.slice(0, 8);

  return (
    <div className="card p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold tracking-wide text-text-secondary">Recent Trades</h3>
        {loaded && trades.length > 0 && (
          <span className="text-[0.5rem] tabular-nums" style={{ color: "#6b80a0" }}>
            {trades.length} total
          </span>
        )}
      </div>

      {!loaded ? (
        <div className="flex-1 flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-10 rounded" style={{ opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6">
          <span className="text-2xl opacity-40">📋</span>
          <span className="text-xs text-text-muted">No trades yet</span>
        </div>
      ) : (
        <div className="flex flex-col divide-y" style={{ borderColor: "#1b2d4a" }}>
          {recent.map((t, i) => {
            const isBuy = t.action.toLowerCase() === "buy";
            return (
              <div key={t.id ?? i} className="flex items-start gap-2.5 py-2.5 group">
                {/* Action badge */}
                <div className="shrink-0 mt-0.5 w-10 text-center py-0.5 rounded text-[0.45rem] font-black tracking-widest"
                  style={isBuy
                    ? { background: "rgba(74,222,128,0.12)", color: "#4ade80" }
                    : { background: "rgba(248,113,113,0.12)", color: "#f87171" }}>
                  {isBuy ? "BUY" : "SELL"}
                </div>

                {/* Market name */}
                <div className="flex-1 min-w-0">
                  <div className="text-[0.6rem] font-medium leading-snug text-text-primary"
                    style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {t.market_question}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[0.45rem] tabular-nums" style={{ color: "#6b80a0" }}>
                      {relTime(t.created_at)}
                    </span>
                    {t.side && (
                      <span className="text-[0.45rem] font-semibold uppercase"
                        style={{ color: t.side.toLowerCase() === "yes" ? "#4ade8080" : "#f8717180" }}>
                        {t.side}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cost */}
                <div className="shrink-0 text-right">
                  <div className="text-[0.6rem] font-bold tabular-nums"
                    style={{ color: isBuy ? "#4ade80" : "#f87171" }}>
                    ${(t.cost ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[0.45rem] tabular-nums" style={{ color: "#6b80a0" }}>
                    @{((t.price_before ?? 0) * 100).toFixed(0)}¢
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CityMonitor ──────────────────────────────────────────────────────────────
function CityMonitor({ cities, positions, color, isOnline }: {
  cities: string[]; positions: Position[]; color: string; isOnline: boolean;
}) {
  const cols = cities.length <= 5 ? cities.length : Math.ceil(cities.length / 2);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold tracking-wide text-text-secondary">City Monitor</h3>
        <div className="flex items-center gap-1.5">
          {isOnline && <div className="w-1.5 h-1.5 rounded-full animate-pulse-neon" style={{ background: color }} />}
          <span className="text-[0.5rem]" style={{ color: "#6b80a0" }}>
            {cities.length} cities · {positions.length} active {positions.length === 1 ? "bet" : "bets"}
          </span>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {cities.map(city => {
          const bets  = cityBets(city, positions);
          const pnl   = cityPnl(city, positions);
          const price = cityAvgPrice(city, positions);
          const hasPos = bets > 0;

          // Determine status color
          const dotColor = !isOnline ? "#6b80a0"
            : hasPos ? (pnl >= 0 ? "#4ade80" : "#f87171")
            : color;

          return (
            <div key={city} className="rounded-xl p-3 flex flex-col gap-2 transition-all"
              style={{
                background:  hasPos ? dotColor + "08" : "#05091a",
                border:      `1px solid ${hasPos ? dotColor + "25" : "#1b2d4a"}`,
              }}>
              {/* City name + status */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold font-mono" style={{ color: hasPos ? dotColor : "#92adc9" }}>
                  {city}
                </span>
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasPos && isOnline ? "animate-pulse-neon" : ""}`}
                    style={{ background: dotColor }} />
                </div>
              </div>

              {/* Divider */}
              <div className="h-px" style={{ background: hasPos ? dotColor + "20" : "#1b2d4a" }} />

              {/* Stats */}
              {hasPos ? (
                <>
                  <div>
                    <div className="text-[0.45rem] font-semibold tracking-widest mb-0.5" style={{ color: dotColor + "80" }}>
                      P&L
                    </div>
                    <div className="text-sm font-bold tabular-nums leading-none" style={{ color: dotColor }}>
                      {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.45rem]" style={{ color: "#6b80a0" }}>
                      {bets} {bets === 1 ? "bet" : "bets"}
                    </span>
                    {price !== null && (
                      <span className="text-[0.45rem] font-mono tabular-nums" style={{ color: "#22d3ee" }}>
                        @{(price * 100).toFixed(0)}¢
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <div className="text-[0.45rem] font-semibold tracking-widest" style={{ color: "#6b80a060" }}>
                    STATUS
                  </div>
                  <div className="text-[0.5rem]" style={{ color: isOnline ? color + "60" : "#6b80a0" }}>
                    {isOnline ? "watching" : "offline"}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Reusable sub-components ──────────────────────────────────────────────────
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

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="label-xs">{label}</span>
      <span className="text-[0.65rem] font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}
