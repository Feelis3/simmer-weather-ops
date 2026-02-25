"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import BotCard from "@/components/BotCard";
import PositionsTable from "@/components/PositionsTable";
import TradesTimeline from "@/components/TradesTimeline";
import LogsTerminal from "@/components/LogsTerminal";
import MarketsTable from "@/components/MarketsTable";
import LeaderboardCard from "@/components/LeaderboardCard";
import { BOTS, BOT_IDS, type BotId } from "@/lib/constants";
import { OWNERS, OWNER_IDS, type OwnerId } from "@/lib/owners";
import type {
  StatusResponse,
  TradesResponse,
  MarketsResponse,
  LeaderboardData,
  CronsResponse,
  Position,
  Trade,
} from "@/lib/types";

interface DashboardState {
  status: StatusResponse | null;
  trades: TradesResponse | null;
  markets: MarketsResponse | null;
  leaderboard: LeaderboardData | null;
  crons: CronsResponse | null;
  logs: Record<string, string>;
  error: string | null;
  offline: boolean;
}

export default function OwnerDashboard({ params }: { params: Promise<{ owner: string }> }) {
  const { owner } = use(params);

  if (!OWNER_IDS.includes(owner as OwnerId)) notFound();
  const ownerId = owner as OwnerId;
  const ownerConfig = OWNERS[ownerId];
  const prefix = `/api/bots/${ownerId}`;

  const [state, setState] = useState<DashboardState>({
    status: null, trades: null, markets: null,
    leaderboard: null, crons: null, logs: {}, error: null, offline: false,
  });
  const [logBot, setLogBot] = useState<BotId>("weather");
  const [paused, setPaused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const router = useRouter();

  const fetchFast = useCallback(async () => {
    const [cronsRes, marketsRes] = await Promise.allSettled([
      fetch(`${prefix}/crons`).then((r) => r.json()),
      fetch(`${prefix}/markets`).then((r) => r.json()),
    ]);
    setState((prev) => ({
      ...prev,
      crons: cronsRes.status === "fulfilled" && !cronsRes.value.error ? cronsRes.value : prev.crons,
      markets: marketsRes.status === "fulfilled" && !marketsRes.value.error ? marketsRes.value : prev.markets,
    }));
  }, [prefix]);

  const fetchSlow = useCallback(async () => {
    const [statusRes, tradesRes, lbRes, ...logResults] = await Promise.allSettled([
      fetch(`${prefix}/status`).then((r) => r.json()),
      fetch(`${prefix}/trades`).then((r) => r.json()),
      fetch("/api/leaderboard").then((r) => r.json()),
      ...BOT_IDS.map((bot) => fetch(`${prefix}/logs/${bot}?lines=50`).then((r) => r.json())),
    ]);
    const logs: Record<string, string> = {};
    BOT_IDS.forEach((bot, i) => {
      const result = logResults[i];
      if (result.status === "fulfilled") logs[bot] = result.value?.log ?? "";
    });
    setState((prev) => {
      const statusVal = statusRes.status === "fulfilled" ? statusRes.value : null;
      const offline = statusVal?.offline === true;
      const error = statusVal?.error && !offline ? statusVal.error : prev.error;
      return {
        ...prev,
        status: statusVal && !offline && !statusVal.error ? statusVal as StatusResponse : prev.status,
        trades: tradesRes.status === "fulfilled" && !tradesRes.value.error ? tradesRes.value : prev.trades,
        leaderboard: lbRes.status === "fulfilled" && !lbRes.value.error ? lbRes.value : prev.leaderboard,
        logs, error: error ?? null, offline,
      };
    });
    setLastUpdated(new Date());
  }, [prefix]);

  const fetchAll = useCallback(async () => {
    try { fetchFast(); await fetchSlow(); }
    catch (e) { setState((prev) => ({ ...prev, error: String(e) })); }
  }, [fetchFast, fetchSlow]);

  useEffect(() => {
    fetchFast(); fetchSlow();
    timerRef.current = setInterval(fetchAll, 30000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchFast, fetchSlow, fetchAll, prefix]);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true); await fetchAll(); setIsRefreshing(false);
  };
  const handleToggle = async (bot: BotId, enabled: boolean) => {
    await fetch(`${prefix}/toggle/${bot}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
    fetchAll();
  };
  const handleRun = async (bot: BotId) => {
    await fetch(`${prefix}/run/${bot}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setTimeout(fetchAll, 2000);
  };
  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); };
  const handlePause = async () => {
    const newPaused = !paused;
    await fetch("/api/pause", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paused: newPaused }) });
    setPaused(newPaused); fetchAll();
  };

  const portfolio = state.status?.portfolio;
  const account = state.status?.account;
  const allPositions = state.status?.positions?.positions ?? [];
  const positions: Position[] = allPositions.filter((p) => p.venue === "polymarket");
  const allTrades = state.trades?.trades ?? [];
  const trades: Trade[] = allTrades.filter((t) => t.venue === "polymarket");
  const markets = state.markets?.markets ?? [];
  const hasData = state.crons || state.status;
  const c = ownerConfig.color;

  return (
    <div className="min-h-screen bg-bg text-text-primary">

      {/* ── Sub-header bar ─────────────────────────── */}
      <div className="border-b border-border" style={{ background: "rgba(2,4,11,0.7)" }}>
        <div className="max-w-[1440px] mx-auto px-5 h-10 flex items-center justify-between gap-6">

          {/* Left: owner identity */}
          <div className="flex items-center gap-3">
            <span className="text-xl leading-none">{ownerConfig.emoji}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text-primary">{ownerConfig.name}</span>
              <span className="label-xs" style={{ color: c + "70" }}>{ownerConfig.type}</span>
            </div>
            {/* Status */}
            {state.offline ? (
              <span className="pill text-[0.45rem]" style={{ background: "#182035", color: "#4a6080" }}>PENDING</span>
            ) : state.error ? (
              <span className="pill text-[0.45rem]" style={{ background: "#ff335510", color: "#ff3358" }}>ERROR</span>
            ) : state.status ? (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse-neon" style={{ background: c }} />
                <span className="text-[0.45rem] font-black tracking-widest" style={{ color: c }}>LIVE</span>
              </div>
            ) : null}
          </div>

          {/* Center: stats */}
          <div className="hidden md:flex items-center gap-6">
            <StatChip label="USDC" value={`$${(portfolio?.balance_usdc ?? 0).toFixed(2)}`} color={c} />
            <StatChip label="Exposure" value={`$${(portfolio?.total_exposure ?? 0).toFixed(2)}`} color="#f59e0b" />
            <StatChip label="Positions" value={String(positions.length)} color="#a78bfa" />
            <StatChip label="Trades" value={String(trades.length)} color="#22d3ee" />
            {account?.win_rate != null && (
              <StatChip label="Win Rate" value={`${(account.win_rate * 100).toFixed(0)}%`} color={c} />
            )}
            <div className="w-px h-4 bg-border" />
            <LeaderboardCard data={state.leaderboard} />
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30"
            >
              <svg
                width="11" height="11" viewBox="0 0 13 13" fill="none"
                className={isRefreshing ? "animate-spin-refresh" : ""}
              >
                <path d="M12 6.5A5.5 5.5 0 1 1 6.5 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M12 1v5.5H6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {lastUpdated && !isRefreshing && (
                <span className="text-[0.45rem] tabular-nums hidden sm:block" style={{ color: "#4a6080" }}>
                  {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </button>
            <div className="w-px h-3 bg-border" />
            <button
              onClick={handlePause}
              className="pill text-[0.5rem] transition-all"
              style={paused
                ? { background: "#ff335512", color: "#ff3358" }
                : { background: c + "12", color: c }
              }
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={handleLogout}
              className="text-[0.5rem] font-semibold tracking-wider uppercase transition-colors"
              style={{ color: "#4a6080" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ff3358")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#4a6080")}
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-5 py-6 space-y-5">

        {/* Cities strip */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="label-xs">Markets:</span>
          {ownerConfig.cities.map((city) => (
            <span
              key={city}
              className="text-[0.55rem] px-2.5 py-1 rounded-lg font-mono font-semibold tracking-wide"
              style={{ background: c + "10", color: c + "aa", border: `1px solid ${c}18` }}
            >
              {city}
            </span>
          ))}
        </div>

        {/* ── Offline state ──────────────────────────── */}
        {state.offline && (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: "#070910", border: "1px solid #0e1220" }}
          >
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-base font-bold text-text-primary mb-1">
              {ownerConfig.name}&apos;s bot is not configured yet
            </p>
            <p className="text-xs text-text-secondary">
              Set <span className="font-mono" style={{ color: c }}>BOT_{ownerId.toUpperCase()}_VPS_URL</span> in .env.local to enable
            </p>
          </div>
        )}

        {state.error && !state.offline && (
          <div
            className="rounded-xl px-4 py-3 text-xs"
            style={{ background: "#ff335508", border: "1px solid #ff335530" }}
          >
            <span className="font-bold text-red">VPS Error — </span>
            <span style={{ color: "#ff335588" }}>{state.error}</span>
          </div>
        )}

        {!state.offline && (
          <>
            {/* ── Row 1: Bot sub-cards + Stats ─────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {hasData ? (
                  BOT_IDS.map((bot) => (
                    <BotCard
                      key={bot}
                      botId={bot}
                      active={state.crons?.bots?.[bot]?.active ?? false}
                      log={state.logs[bot] ?? ""}
                      onToggle={(enabled) => handleToggle(bot, enabled)}
                      onRun={() => handleRun(bot)}
                    />
                  ))
                ) : (
                  <>
                    <Skeleton className="h-[180px]" />
                    <Skeleton className="h-[180px]" />
                    <Skeleton className="h-[180px]" />
                  </>
                )}
              </div>

              {/* Stats sidebar */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                <BigStat label="Balance" value={`$${(portfolio?.balance_usdc ?? 0).toFixed(2)}`} color={c} />
                <BigStat label="Exposure" value={`$${(portfolio?.total_exposure ?? 0).toFixed(2)}`} color="#f59e0b" />
                <BigStat label="Open Positions" value={String(positions.length)} color="#a78bfa" />
                <BigStat
                  label="Win Rate"
                  value={account?.win_rate != null ? `${(account.win_rate * 100).toFixed(0)}%` : "—"}
                  sub={account ? `${account.win_count ?? 0}W · ${account.loss_count ?? 0}L` : undefined}
                  color={c}
                />
              </div>
            </div>

            {/* ── Row 2: Positions + Trades ─────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {state.status ? <PositionsTable positions={positions} /> : <Skeleton className="h-[220px]" />}
              {state.trades ? <TradesTimeline trades={trades} /> : <Skeleton className="h-[220px]" />}
            </div>

            {/* ── Row 3: Logs + Markets ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                {/* Log tabs */}
                <div
                  className="flex items-center gap-0.5 p-0.5 rounded-xl"
                  style={{ background: "#070910", border: "1px solid #0e1220" }}
                >
                  {BOT_IDS.map((bot) => (
                    <button
                      key={bot}
                      onClick={() => setLogBot(bot)}
                      className="px-3 py-1.5 rounded-lg text-[0.6rem] font-semibold tracking-wide transition-all flex-1"
                      style={
                        logBot === bot
                          ? { background: BOTS[bot].color + "18", color: BOTS[bot].color }
                          : { color: "#4a6080" }
                      }
                    >
                      {BOTS[bot].emoji} {BOTS[bot].label}
                    </button>
                  ))}
                </div>
                <LogsTerminal botId={logBot} log={state.logs[logBot] ?? ""} />
              </div>

              {state.markets ? <MarketsTable markets={markets} /> : <Skeleton className="h-[300px]" />}
            </div>
          </>
        )}
      </main>

      <footer
        className="border-t border-border mt-8 py-4"
        style={{ background: "rgba(2,4,11,0.5)" }}
      >
        <div className="max-w-[1440px] mx-auto px-5 flex items-center justify-between">
          <span className="label-xs" style={{ color: "#252e45" }}>
            {ownerConfig.name} · auto-refresh 30s
          </span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-neon" style={{ background: c }} />
            <span className="text-[0.5rem] tabular-nums" style={{ color: "#252e45" }}>
              {state.status?.timestamp ? new Date(state.status.timestamp).toLocaleTimeString() : "---"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="label-xs">{label}</span>
      <span className="text-[0.65rem] font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function BigStat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "#070910", border: "1px solid #0e1220" }}
    >
      <div className="label-xs mb-2">{label}</div>
      <div className="stat-xl tabular-nums animate-number" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-[0.5rem] mt-1" style={{ color: "#4a6080" }}>{sub}</div>}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ""}`} />;
}
