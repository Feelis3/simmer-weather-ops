"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import TradesTimeline from "@/components/TradesTimeline";
import LeaderboardCard from "@/components/LeaderboardCard";
import { BOTS } from "@/lib/constants";
import { OWNERS, OWNER_IDS, type OwnerId, type EasterEggId } from "@/lib/owners";
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

const KONAMI_SEQ = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];

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

  // ── Easter egg state ────────────────────────────────────────────────────────
  const [konamiIdx, setKonamiIdx] = useState(0);
  const [konamiActive, setKonamiActive] = useState(false);
  const [avatarClicks, setAvatarClicks] = useState(0);
  const [eggActive, setEggActive] = useState(false);
  const [bananaPos, setBananaPos] = useState<{ left: number; delay: number; dur: number }[]>([]);

  // ── Spotify widget state ────────────────────────────────────────────────────
  const [spotifyVisible, setSpotifyVisible] = useState(false);
  const [spotifyMinimized, setSpotifyMinimized] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────────
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

  // Show Spotify widget after data loads
  useEffect(() => {
    if (state.status && ownerConfig.spotify) {
      const t = setTimeout(() => setSpotifyVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, [state.status, ownerConfig.spotify]);

  // ── Konami code ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      setKonamiIdx(prev => {
        if (e.key === KONAMI_SEQ[prev]) {
          const next = prev + 1;
          if (next === KONAMI_SEQ.length) {
            setKonamiActive(true);
            setTimeout(() => setKonamiActive(false), 3500);
            return 0;
          }
          return next;
        }
        return 0;
      });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Avatar click easter egg ───────────────────────────────────────────────────
  const handleAvatarClick = useCallback(() => {
    setAvatarClicks(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setEggActive(true);
        if (ownerConfig.easterEgg === "monkey-brain") {
          setBananaPos(Array.from({ length: 18 }, () => ({
            left: Math.random() * 95,
            delay: Math.random() * 1.2,
            dur: 1.4 + Math.random() * 1.8,
          })));
        }
        setTimeout(() => setEggActive(false), 3500);
        return 0;
      }
      return next;
    });
  }, [ownerConfig.easterEgg]);

  // ── Bot controls ─────────────────────────────────────────────────────────────
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

  // ── Derived data ──────────────────────────────────────────────────────────────
  const portfolio = state.status?.portfolio;
  const account   = state.status?.account;
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
    <div className={`min-h-screen bg-bg text-text-primary${konamiActive ? " animate-crazy-shake" : ""}`}>

      {/* ── Easter egg overlays ─────────────────────────────────────────── */}
      {konamiActive && <KonamiOverlay />}
      {eggActive && ownerConfig.easterEgg && (
        <EasterEggOverlay type={ownerConfig.easterEgg} color={c} bananas={bananaPos} />
      )}

      {/* ── Spotify widget ──────────────────────────────────────────────── */}
      {ownerConfig.spotify && spotifyVisible && (
        <SpotifyWidget
          track={ownerConfig.spotify}
          color={c}
          minimized={spotifyMinimized}
          onMinimize={() => setSpotifyMinimized(true)}
          onRestore={() => setSpotifyMinimized(false)}
          onClose={() => setSpotifyVisible(false)}
        />
      )}

      {/* ── Sub-header ──────────────────────────────────────────────────── */}
      <div className="border-b border-border" style={{ background: "var(--ui-bg-mid)" }}>
        <div className="max-w-[1440px] mx-auto px-5 h-11 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">

            {/* Avatar — click 5× for easter egg */}
            <button
              onClick={handleAvatarClick}
              className="shrink-0 transition-all active:scale-90 relative"
              title={`${ownerConfig.name} · click 5× for a secret`}
            >
              <BotAvatar owner={ownerConfig} size={28} />
              {avatarClicks > 0 && avatarClicks < 5 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[0.38rem] font-black flex items-center justify-center"
                  style={{ background: c, color: "#000" }}>
                  {5 - avatarClicks}
                </span>
              )}
            </button>

            <span className="text-sm font-bold text-text-primary">{ownerConfig.name}</span>
            <span className="label-xs" style={{ color: c + "70" }}>{ownerConfig.type}</span>

            {state.offline ? (
              <span className="pill text-[0.45rem]" style={{ background: "var(--ui-card)", color: "var(--ui-t2b)" }}>PENDING</span>
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
                <span className="text-[0.45rem] tabular-nums hidden sm:block" style={{ color: "var(--ui-t2)" }}>
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
              style={{ color: "var(--ui-t2)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--ui-t2)")}>
              Exit
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-5 py-6 space-y-5">

        {/* ── Offline / Error ────────────────────────────────────────────── */}
        {state.offline && (
          <div className="rounded-2xl p-12 text-center"
            style={{ background: "var(--ui-card)", border: "1px solid var(--ui-border)" }}>
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
            {/* ── Row 1: Key stats ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <BigStat label="Balance" value={`$${balance.toFixed(2)}`}
                sub="USDC wallet" color={c} loading={!state.status} />
              <BigStat label="Exposure" value={`$${exposure.toFixed(2)}`}
                sub="at risk in markets" color="#f59e0b" loading={!state.status} />
              <BigStat label="Open Positions" value={String(positions.length)}
                sub={positions.length > 0 ? `Open P&L: ${openPnl >= 0 ? "+" : ""}$${openPnl.toFixed(2)}` : "No open positions"}
                color="#a78bfa" loading={!state.status} />
              <BigStat label="Total Trades"
                value={account?.trades_count != null ? String(account.trades_count) : "—"}
                sub={account ? `${account.win_count ?? 0} wins · ${account.loss_count ?? 0} losses` : undefined}
                color={c} loading={!state.status} />
            </div>

            {/* ── Row 2: Positions table ────────────────────────────────── */}
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
                      <tr style={{ borderBottom: "1px solid var(--ui-border)" }}>
                        {["Market","Side","Price","Shares","Cost Basis","Curr. Value","P&L","Expires"].map(h => (
                          <th key={h} className="pb-2.5 text-left pr-3"
                            style={{ color: "var(--ui-t2)", fontSize: "0.5rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {positions.sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).map((pos, i) => {
                        const isYes  = (pos.shares_yes ?? 0) > 0;
                        const shares = isYes ? pos.shares_yes : pos.shares_no;
                        const pnlPos = pos.pnl >= 0;
                        const expires = pos.resolves_at
                          ? new Date(pos.resolves_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : "—";
                        return (
                          <tr key={pos.market_id ?? i}
                            style={{ borderBottom: "1px solid var(--ui-border-faint)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--ui-hover)")}
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
                            <td className="py-3 pr-3 tabular-nums font-mono text-xs" style={{ color: "var(--ui-t2b)" }}>
                              {(shares ?? 0).toFixed(0)}
                            </td>
                            <td className="py-3 pr-3 tabular-nums font-mono text-xs" style={{ color: "var(--ui-t2)" }}>
                              ${pos.cost_basis.toFixed(2)}
                            </td>
                            <td className="py-3 pr-3 tabular-nums font-mono text-xs font-semibold" style={{ color: "var(--ui-t1)" }}>
                              ${pos.current_value.toFixed(2)}
                            </td>
                            <td className="py-3 pr-3 tabular-nums font-mono text-xs font-bold"
                              style={{ color: pnlPos ? "#4ade80" : "#f87171" }}>
                              {pnlPos ? "+" : ""}${pos.pnl.toFixed(2)}
                            </td>
                            <td className="py-3 text-[0.55rem] tabular-nums" style={{ color: "var(--ui-t2)" }}>
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

            {/* ── Row 3: PnlBreakdown | TradeFeed | WeatherBot ─────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <PnlBreakdown positions={positions} openPnl={openPnl} color={c} loaded={!!state.status} />
              <TradeFeed trades={trades} color={c} loaded={!!state.trades} />

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

            {/* ── Row 4: City Monitor ───────────────────────────────────── */}
            <CityMonitor cities={ownerConfig.cities} positions={positions} color={c} isOnline={!!state.status} />

            {/* ── Row 5: Trades timeline ────────────────────────────────── */}
            {trades.length > 0 && <TradesTimeline trades={trades} />}
          </>
        )}
      </main>

      <footer className="border-t border-border mt-8 py-4" style={{ background: "var(--ui-bg-soft)" }}>
        <div className="max-w-[1440px] mx-auto px-5 flex items-center justify-between">
          <span className="label-xs" style={{ color: "var(--ui-t2)" }}>{ownerConfig.name} · auto-refresh 30s</span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-neon" style={{ background: c }} />
            <span className="text-[0.5rem] tabular-nums" style={{ color: "var(--ui-t2)" }}>
              {state.status?.timestamp ? new Date(state.status.timestamp).toLocaleTimeString() : "---"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── BotAvatar ─────────────────────────────────────────────────────────────────
function BotAvatar({ owner, size }: {
  owner: { avatar?: string; emoji: string; name: string; color: string };
  size: number;
}) {
  const [imgSrc, setImgSrc] = useState(owner.avatar ? `${owner.avatar}.jpg` : null);
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (imgSrc?.endsWith(".jpg") && owner.avatar) {
      setImgSrc(`${owner.avatar}.svg`);
    } else {
      setFailed(true);
    }
  };

  if (!imgSrc || failed) {
    return <span style={{ fontSize: size * 0.75 }}>{owner.emoji}</span>;
  }

  return (
    <img src={imgSrc} alt={owner.name} onError={handleError}
      className="rounded-full object-cover"
      style={{ width: size, height: size, outline: `2px solid ${owner.color}40`, outlineOffset: 1 }} />
  );
}

// ─── StatChip / BigStat ───────────────────────────────────────────────────────
function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="label-xs">{label}</span>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function BigStat({ label, value, sub, color, loading }: {
  label: string; value: string; sub?: string; color: string; loading: boolean;
}) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="label-xs">{label}</div>
      {loading
        ? <div className="skeleton h-8 w-28 rounded" />
        : <div className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</div>}
      {sub && <div className="text-[0.5rem] tabular-nums" style={{ color: "var(--ui-t2)" }}>{sub}</div>}
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
          <div>
            <div className="label-xs mb-1">Open P&L</div>
            <div className="text-3xl font-bold tabular-nums"
              style={{ color: openPnl >= 0 ? "#4ade80" : "#f87171" }}>
              {openPnl >= 0 ? "+" : ""}${openPnl.toFixed(2)}
            </div>
            <div className="text-[0.5rem] mt-1 tabular-nums" style={{ color: "var(--ui-t2)" }}>
              ${totalVal.toFixed(2)} current · ${totalCost.toFixed(2)} cost basis
            </div>
          </div>
          <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "var(--ui-border)" }}>
            <div className="absolute inset-y-0 left-0 rounded-full transition-all"
              style={{
                width: `${Math.min(100, totalCost > 0 ? (totalVal / totalCost) * 100 : 0)}%`,
                background: openPnl >= 0 ? "#4ade80" : "#f87171",
              }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2.5" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.12)" }}>
              <div className="text-[0.45rem] font-bold tracking-widest mb-1" style={{ color: "#4ade80" }}>YES BETS</div>
              <div className="text-sm font-bold tabular-nums" style={{ color: "#4ade80" }}>
                {yesBets.length} <span className="text-[0.6rem] font-normal" style={{ color: "#4ade8080" }}>positions</span>
              </div>
              {yesBets.length > 0 && (
                <div className="text-[0.55rem] tabular-nums mt-0.5" style={{ color: yesPnl >= 0 ? "#4ade80" : "#f87171" }}>
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
                <div className="text-[0.55rem] tabular-nums mt-0.5" style={{ color: noPnl >= 0 ? "#4ade80" : "#f87171" }}>
                  {noPnl >= 0 ? "+" : ""}${noPnl.toFixed(2)}
                </div>
              )}
            </div>
          </div>
          {(profitable + under) > 0 && (
            <div className="flex items-center gap-2 text-[0.5rem]" style={{ color: "var(--ui-t2)" }}>
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
          <span className="text-[0.5rem] tabular-nums" style={{ color: "var(--ui-t2)" }}>{trades.length} total</span>
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
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--ui-border)" }}>
          {recent.map((t, i) => {
            const isBuy = t.action.toLowerCase() === "buy";
            return (
              <div key={t.id ?? i} className="flex items-start gap-2.5 py-2.5">
                <div className="shrink-0 mt-0.5 w-10 text-center py-0.5 rounded text-[0.45rem] font-black tracking-widest"
                  style={isBuy
                    ? { background: "rgba(74,222,128,0.12)", color: "#4ade80" }
                    : { background: "rgba(248,113,113,0.12)", color: "#f87171" }}>
                  {isBuy ? "BUY" : "SELL"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.6rem] font-medium leading-snug text-text-primary"
                    style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {t.market_question}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[0.45rem] tabular-nums" style={{ color: "var(--ui-t2)" }}>{relTime(t.created_at)}</span>
                    {t.side && (
                      <span className="text-[0.45rem] font-semibold uppercase"
                        style={{ color: t.side.toLowerCase() === "yes" ? "#4ade8080" : "#f8717180" }}>
                        {t.side}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[0.6rem] font-bold tabular-nums" style={{ color: isBuy ? "#4ade80" : "#f87171" }}>
                    ${(t.cost ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[0.45rem] tabular-nums" style={{ color: "var(--ui-t2)" }}>
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
          <span className="text-[0.5rem]" style={{ color: "var(--ui-t2)" }}>
            {cities.length} cities · {positions.length} active {positions.length === 1 ? "bet" : "bets"}
          </span>
        </div>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {cities.map(city => {
          const bets   = cityBets(city, positions);
          const pnl    = cityPnl(city, positions);
          const price  = cityAvgPrice(city, positions);
          const hasPos = bets > 0;
          const dotColor = !isOnline ? "var(--ui-t2)"
            : hasPos ? (pnl >= 0 ? "#4ade80" : "#f87171")
            : color;
          return (
            <div key={city} className="rounded-xl p-3 flex flex-col gap-2 transition-all"
              style={{
                background: hasPos
                  ? (pnl >= 0 ? "rgba(74,222,128,0.04)" : "rgba(248,113,113,0.04)")
                  : "var(--ui-card)",
                border: `1px solid ${hasPos ? (pnl >= 0 ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)") : "var(--ui-border)"}`,
              }}>
              <div className="flex items-center justify-between">
                <span className="text-[0.55rem] font-bold tracking-wide" style={{ color: "var(--ui-t1)" }}>{city}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${hasPos && isOnline ? "animate-pulse-neon" : ""}`}
                  style={{ background: dotColor }} />
              </div>
              {hasPos ? (
                <>
                  <div className="text-sm font-bold tabular-nums"
                    style={{ color: pnl >= 0 ? "#4ade80" : "#f87171" }}>
                    {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                  </div>
                  <div className="text-[0.45rem]" style={{ color: "var(--ui-t2)" }}>
                    {bets} {bets === 1 ? "bet" : "bets"}{price != null && ` · avg ${(price * 100).toFixed(0)}¢`}
                  </div>
                </>
              ) : (
                <div className="text-[0.45rem]" style={{ color: "var(--ui-t3)" }}>watching</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SpotifyWidget ─────────────────────────────────────────────────────────────
function SpotifyLogo({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

function SpotifyWidget({
  track, color, minimized, onMinimize, onRestore, onClose,
}: {
  track: { title: string; artist: string };
  color: string; minimized: boolean;
  onMinimize: () => void; onRestore: () => void; onClose: () => void;
}) {
  if (minimized) {
    return (
      <button onClick={onRestore}
        className="fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-110"
        style={{ background: "#1DB954" }}
        title={`${track.title} — ${track.artist}`}>
        <SpotifyLogo size={20} color="white" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-56 rounded-2xl shadow-2xl animate-spotify-in overflow-hidden"
      style={{ background: "var(--ui-card)", border: "1px solid var(--ui-border)" }}>
      {/* accent bar */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, #1DB954, ${color})` }} />
      {/* header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-1.5">
          <SpotifyLogo size={11} color="#1DB954" />
          <span className="text-[0.42rem] font-black tracking-widest" style={{ color: "#1DB954" }}>SONANDO AHORA</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onMinimize} className="px-1 rounded hover:opacity-60 transition-opacity text-[0.65rem]"
            style={{ color: "var(--ui-t2)" }}>_</button>
          <button onClick={onClose} className="px-1 rounded hover:opacity-60 transition-opacity text-[0.65rem]"
            style={{ color: "var(--ui-t2)" }}>✕</button>
        </div>
      </div>
      {/* track info */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2.5">
          <img src="/avatars/piel-cover.jpg" alt="Piel"
            className="w-10 h-10 rounded-xl shrink-0 object-cover"
            style={{ border: "1px solid #1DB95425" }}
          />
          <div className="min-w-0">
            <div className="text-[0.65rem] font-bold leading-tight truncate" style={{ color: "var(--ui-t1)" }}>
              {track.title}
            </div>
            <div className="text-[0.5rem] truncate mt-0.5" style={{ color: "#1DB954" }}>{track.artist}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Easter Egg Overlays ──────────────────────────────────────────────────────
function KonamiOverlay() {
  return (
    <div className="fixed inset-0 z-[999] pointer-events-none flex items-center justify-center"
      style={{ animation: "crazy-flash 0.12s ease-in-out infinite", background: "rgba(34,197,94,0.12)" }}>
      <div className="text-center animate-egg-pop">
        <div className="text-8xl mb-3" style={{ animation: "spin-refresh 0.35s linear infinite" }}>🟢</div>
        <div className="text-5xl font-black" style={{
          color: "#22c55e",
          textShadow: "0 0 30px rgba(34,197,94,0.8), 0 0 60px rgba(34,197,94,0.4)",
        }}>GOING CRAZY</div>
        <div className="text-xs mt-2 font-mono tracking-widest opacity-60" style={{ color: "#22c55e" }}>
          KONAMI CODE ↑↑↓↓←→←→BA
        </div>
      </div>
    </div>
  );
}

function EasterEggOverlay({ type, color, bananas }: {
  type: EasterEggId; color: string;
  bananas: { left: number; delay: number; dur: number }[];
}) {
  if (type === "monkey-brain") {
    return (
      <div className="fixed inset-0 z-[999] pointer-events-none overflow-hidden">
        {bananas.map((b, i) => (
          <div key={i} className="absolute text-4xl select-none"
            style={{
              left: `${b.left}%`, top: "-60px",
              animation: `fall ${b.dur}s linear ${b.delay}s forwards`,
            }}>🍌</div>
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center animate-egg-pop rounded-2xl px-10 py-8"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}>
            <div className="text-6xl mb-3">🧠🐒🧠</div>
            <div className="text-3xl font-black" style={{ color }}>MONKEY BRAIN</div>
            <div className="text-sm mt-1 font-mono tracking-widest opacity-60" style={{ color }}>ACTIVATED</div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "going-crazy") {
    return (
      <div className="fixed inset-0 z-[999] pointer-events-none flex items-center justify-center"
        style={{ animation: "crazy-flash 0.14s ease-in-out infinite", background: "rgba(34,197,94,0.10)" }}>
        <div className="text-center animate-egg-pop">
          <div className="text-8xl" style={{ animation: "spin-refresh 0.4s linear infinite" }}>🟢</div>
          <div className="text-5xl font-black mt-4" style={{
            color: "#22c55e",
            textShadow: "0 0 20px rgba(34,197,94,0.8)",
          }}>¡GOING CRAZY!</div>
          <div className="text-xs mt-2 font-mono tracking-widest opacity-50" style={{ color: "#22c55e" }}>
            click avatar 5× to activate
          </div>
        </div>
      </div>
    );
  }

  return null;
}
