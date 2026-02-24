"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import BotCard from "@/components/BotCard";
import PositionsTable from "@/components/PositionsTable";
import TradesTimeline from "@/components/TradesTimeline";
import LogsTerminal from "@/components/LogsTerminal";
import MarketsTable from "@/components/MarketsTable";
import BtcWidget from "@/components/BtcWidget";
import LeaderboardCard from "@/components/LeaderboardCard";
import PnlChart from "@/components/PnlChart";
import { BOTS, BOT_IDS, type BotId } from "@/lib/constants";
import type {
  StatusResponse,
  TradesResponse,
  MarketsResponse,
  BtcData,
  LeaderboardData,
  CronsResponse,
  Position,
  Trade,
} from "@/lib/types";

interface DashboardState {
  status: StatusResponse | null;
  trades: TradesResponse | null;
  markets: MarketsResponse | null;
  btc: BtcData | null;
  leaderboard: LeaderboardData | null;
  crons: CronsResponse | null;
  logs: Record<string, string>;
  error: string | null;
}

export default function Dashboard() {
  const [state, setState] = useState<DashboardState>({
    status: null,
    trades: null,
    markets: null,
    btc: null,
    leaderboard: null,
    crons: null,
    logs: {},
    error: null,
  });
  const [logBot, setLogBot] = useState<BotId>("weather");
  const [paused, setPaused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const btcTimerRef = useRef<ReturnType<typeof setInterval>>(null);
  const router = useRouter();

  const fetchFast = useCallback(async () => {
    const [btcRes, cronsRes, marketsRes] = await Promise.allSettled([
      fetch("/api/btc").then((r) => r.json()),
      fetch("/api/crons").then((r) => r.json()),
      fetch("/api/markets").then((r) => r.json()),
    ]);
    setState((prev) => ({
      ...prev,
      btc: btcRes.status === "fulfilled" ? btcRes.value : prev.btc,
      crons: cronsRes.status === "fulfilled" ? cronsRes.value : prev.crons,
      markets: marketsRes.status === "fulfilled" ? marketsRes.value : prev.markets,
    }));
  }, []);

  const fetchSlow = useCallback(async () => {
    const [statusRes, tradesRes, lbRes, ...logResults] = await Promise.allSettled([
      fetch("/api/status").then((r) => r.json()),
      fetch("/api/trades").then((r) => r.json()),
      fetch("/api/leaderboard").then((r) => r.json()),
      ...BOT_IDS.map((bot) => fetch(`/api/logs/${bot}?lines=50`).then((r) => r.json())),
    ]);

    const logs: Record<string, string> = {};
    BOT_IDS.forEach((bot, i) => {
      const result = logResults[i];
      if (result.status === "fulfilled") logs[bot] = result.value?.log ?? "";
    });

    setState((prev) => ({
      ...prev,
      status: statusRes.status === "fulfilled" ? statusRes.value : prev.status,
      trades: tradesRes.status === "fulfilled" ? tradesRes.value : prev.trades,
      leaderboard: lbRes.status === "fulfilled" ? lbRes.value : prev.leaderboard,
      logs,
      error: null,
    }));
    setLastUpdated(new Date());
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      fetchFast();
      await fetchSlow();
    } catch (e) {
      setState((prev) => ({ ...prev, error: String(e) }));
    }
  }, [fetchFast, fetchSlow]);

  useEffect(() => {
    fetchFast();
    fetchSlow();
    timerRef.current = setInterval(fetchAll, 30000);
    btcTimerRef.current = setInterval(() => {
      fetch("/api/btc").then((r) => r.json()).then((data) => {
        if (!data.error) setState((prev) => ({ ...prev, btc: data }));
      }).catch(() => {});
    }, 15000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (btcTimerRef.current) clearInterval(btcTimerRef.current);
    };
  }, [fetchFast, fetchSlow, fetchAll]);

  // Actions
  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await fetchAll();
    setIsRefreshing(false);
  };

  const handleToggle = async (bot: BotId, enabled: boolean) => {
    await fetch(`/api/toggle/${bot}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    fetchAll();
  };

  const handleRun = async (bot: BotId) => {
    await fetch(`/api/run/${bot}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setTimeout(fetchAll, 2000);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handlePause = async () => {
    const newPaused = !paused;
    await fetch("/api/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paused: newPaused }),
    });
    setPaused(newPaused);
    fetchAll();
  };

  // Derived data (filter out SIM)
  const portfolio = state.status?.portfolio;
  const account = state.status?.account;
  const allPositions = state.status?.positions?.positions ?? [];
  const positions: Position[] = allPositions.filter((p) => p.venue === "polymarket");
  const allTrades = state.trades?.trades ?? [];
  const trades: Trade[] = allTrades.filter((t) => t.venue === "polymarket");
  const markets = state.markets?.markets ?? [];
  const polyPnl = state.status?.account?.polymarket_pnl ?? state.status?.portfolio?.pnl_total ?? 0;

  const hasData = state.btc || state.crons || state.status;

  return (
    <div className="min-h-screen bg-bg text-text-primary font-sans">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50" style={{ background: "rgba(11, 18, 41, 0.88)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-[1440px] mx-auto px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(3,231,139,0.12)" }}>
                <span className="text-neon text-[0.6rem] font-black">C</span>
              </div>
              <span className="text-text-primary font-bold text-sm tracking-wider">CLAWDBOT</span>
              <span className="text-text-muted text-xs">/</span>
              <span className="text-pink text-[0.6rem] font-semibold tracking-widest">OPS</span>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-4 overflow-x-auto">
              <HeaderStat label="USDC" value={`$${(portfolio?.balance_usdc ?? 0).toFixed(2)}`} color="text-neon" />
              <Sep />
              <HeaderStat
                label="P&L"
                value={`${polyPnl >= 0 ? "+" : ""}$${polyPnl.toFixed(2)}`}
                color={polyPnl >= 0 ? "text-neon" : "text-red"}
              />
              <Sep />
              <HeaderStat label="Exp" value={`$${(portfolio?.total_exposure ?? 0).toFixed(2)}`} color="text-amber" />
              <Sep />
              <BtcWidget data={state.btc} />
              <Sep />
              <LeaderboardCard data={state.leaderboard} />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Manual refresh */}
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                title={lastUpdated ? `Última actualización: ${lastUpdated.toLocaleTimeString()}` : "Actualizar"}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-text-muted hover:text-neon hover:bg-neon/8 transition-all disabled:opacity-40"
              >
                <svg
                  width="13" height="13" viewBox="0 0 13 13" fill="none"
                  className={isRefreshing ? "animate-spin-refresh" : ""}
                >
                  <path d="M12 6.5A5.5 5.5 0 1 1 6.5 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <path d="M12 1v5.5H6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {lastUpdated && !isRefreshing && (
                  <span className="text-[0.5rem] tabular-nums hidden sm:block">
                    {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                )}
                {isRefreshing && (
                  <span className="text-[0.5rem] text-neon hidden sm:block">sync…</span>
                )}
              </button>

              <div className="w-px h-4 bg-border" />

              <button
                onClick={handlePause}
                className={`pill px-3 py-1 text-[0.6rem] font-semibold transition-all ${
                  paused
                    ? "bg-red/15 text-red hover:bg-red/25"
                    : "bg-neon/10 text-neon hover:bg-neon/20"
                }`}
              >
                {paused ? "Resume" : "Pause"}
              </button>
              <button
                onClick={handleLogout}
                className="text-[0.55rem] font-medium text-text-muted hover:text-red transition-all px-2 py-1"
                title="Logout"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1440px] mx-auto px-5 py-5 space-y-5">
        {state.error && (
          <div className="card p-4" style={{ borderColor: "rgba(255,68,102,0.25)" }}>
            <span className="text-red text-xs font-semibold">VPS Error: </span>
            <span className="text-red/60 text-xs">{state.error}</span>
          </div>
        )}

        {/* Row 1: Bot cards + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
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
                <Skeleton className="h-[180px]" />
              </>
            )}
          </div>

          <div className="space-y-4">
            {state.trades ? (
              <PnlChart trades={allTrades} currentPnl={polyPnl} />
            ) : (
              <Skeleton className="h-[230px]" />
            )}

            <div className="grid grid-cols-3 gap-3">
              <MiniStat
                label="Positions"
                value={String(positions.length)}
                sub={`$${(portfolio?.total_exposure ?? 0).toFixed(0)} exp`}
                color="text-purple"
              />
              <MiniStat
                label="Trades"
                value={String(trades.length)}
                sub={account ? `${account.win_count ?? 0}W ${account.loss_count ?? 0}L` : undefined}
                color="text-cyan"
              />
              <MiniStat
                label="Win Rate"
                value={account?.win_rate != null ? `${(account.win_rate * 100).toFixed(0)}%` : "---"}
                sub={account?.total_pnl_percent != null ? `${account.total_pnl_percent >= 0 ? "+" : ""}${account.total_pnl_percent.toFixed(1)}%` : undefined}
                color="text-neon"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Positions + Trades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {state.status ? (
            <PositionsTable positions={positions} />
          ) : (
            <Skeleton className="h-[200px]" />
          )}
          {state.trades ? (
            <TradesTimeline trades={trades} />
          ) : (
            <Skeleton className="h-[200px]" />
          )}
        </div>

        {/* Row 3: Logs + Markets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-card border border-border">
              {BOT_IDS.map((bot) => (
                <button
                  key={bot}
                  onClick={() => setLogBot(bot)}
                  className={`px-3 py-1.5 rounded-lg text-[0.6rem] font-semibold tracking-wide transition-all flex-1 ${
                    logBot === bot ? "" : "text-text-muted hover:text-text-secondary"
                  }`}
                  style={logBot === bot ? { backgroundColor: BOTS[bot].color + "18", color: BOTS[bot].color } : undefined}
                >
                  {BOTS[bot].emoji} {BOTS[bot].label}
                </button>
              ))}
            </div>
            <LogsTerminal botId={logBot} log={state.logs[logBot] ?? ""} />
          </div>

          {state.markets ? (
            <MarketsTable markets={markets} />
          ) : (
            <Skeleton className="h-[300px]" />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-8 py-3">
        <div className="max-w-[1440px] mx-auto px-5 flex items-center justify-between">
          <span className="text-[0.55rem] text-text-muted">
            194.163.160.76:8420 &middot; auto-refresh 30s
          </span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-neon/40 animate-pulse-neon" />
            <span className="text-[0.55rem] text-text-muted tabular-nums">
              {state.status?.timestamp ? new Date(state.status.timestamp).toLocaleTimeString() : "---"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Helper components ────────────────────────────────

function HeaderStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="hidden md:flex items-center gap-1.5">
      <span className="text-[0.5rem] text-text-muted uppercase tracking-wider">{label}</span>
      <span className={`text-[0.7rem] font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function Sep() {
  return <div className="hidden md:block w-px h-4 bg-border" />;
}

function MiniStat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-[0.55rem] text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[0.5rem] text-text-muted tabular-nums mt-0.5">{sub}</div>}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ""}`} />;
}
