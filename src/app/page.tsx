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
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const btcTimerRef = useRef<ReturnType<typeof setInterval>>(null);
  const router = useRouter();

  // Progressive fetch: fast endpoints first, then slow ones
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
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      // Fire fast endpoints immediately, don't wait for slow ones
      fetchFast();
      await fetchSlow();
    } catch (e) {
      setState((prev) => ({ ...prev, error: String(e) }));
    }
  }, [fetchFast, fetchSlow]);

  useEffect(() => {
    // Progressive: fast data loads instantly, slow follows
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
      <header className="border-b border-border bg-bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-neon font-bold text-sm tracking-wider glow-neon">CLAWDBOT</span>
              <span className="text-text-muted text-xs">//</span>
              <span className="text-pink text-[0.6rem] font-semibold tracking-wider">OPS</span>
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
              <HeaderStat label="Exposure" value={`$${(portfolio?.total_exposure ?? 0).toFixed(2)}`} color="text-amber" />
              <Sep />
              <BtcWidget data={state.btc} />
              <Sep />
              <LeaderboardCard data={state.leaderboard} />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0">
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
        {/* Error */}
        {state.error && (
          <div className="card p-4 border-red/20">
            <span className="text-red text-xs font-semibold">VPS Error: </span>
            <span className="text-red/60 text-xs">{state.error}</span>
          </div>
        )}

        {/* Row 1: Bot cards + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bot cards - 2x2 grid */}
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

          {/* P&L Chart + Stats */}
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
                sub={account?.total_pnl_percent != null ? `${account.total_pnl_percent >= 0 ? "+" : ""}${account.total_pnl_percent.toFixed(1)}% total` : undefined}
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
          {/* Logs */}
          <div className="space-y-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-card border border-border">
              {BOT_IDS.map((bot) => (
                <button
                  key={bot}
                  onClick={() => setLogBot(bot)}
                  className={`px-3 py-1.5 rounded-lg text-[0.6rem] font-semibold tracking-wide transition-all flex-1 ${
                    logBot === bot ? "" : "text-text-muted hover:text-text-secondary"
                  }`}
                  style={logBot === bot ? { backgroundColor: BOTS[bot].color + "15", color: BOTS[bot].color } : undefined}
                >
                  {BOTS[bot].emoji} {BOTS[bot].label}
                </button>
              ))}
            </div>
            <LogsTerminal botId={logBot} log={state.logs[logBot] ?? ""} />
          </div>

          {/* Markets */}
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
            VPS 194.163.160.76:8420 &middot; 30s refresh
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
