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

// ─── State ─────────────────────────────────────────────

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

// ─── Main Dashboard ────────────────────────────────────

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

  // ── Fetch ──────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, tradesRes, marketsRes, btcRes, lbRes, cronsRes, ...logResults] = await Promise.allSettled([
        fetch("/api/status").then((r) => r.json()),
        fetch("/api/trades").then((r) => r.json()),
        fetch("/api/markets").then((r) => r.json()),
        fetch("/api/btc").then((r) => r.json()),
        fetch("/api/leaderboard").then((r) => r.json()),
        fetch("/api/crons").then((r) => r.json()),
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
        markets: marketsRes.status === "fulfilled" ? marketsRes.value : prev.markets,
        btc: btcRes.status === "fulfilled" ? btcRes.value : prev.btc,
        leaderboard: lbRes.status === "fulfilled" ? lbRes.value : prev.leaderboard,
        crons: cronsRes.status === "fulfilled" ? cronsRes.value : prev.crons,
        logs,
        error: null,
      }));
    } catch (e) {
      setState((prev) => ({ ...prev, error: String(e) }));
    }
  }, []);

  const fetchBtc = useCallback(async () => {
    try {
      const res = await fetch("/api/btc");
      const data = await res.json();
      if (!data.error) setState((prev) => ({ ...prev, btc: data }));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(fetchAll, 30000);
    btcTimerRef.current = setInterval(fetchBtc, 15000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (btcTimerRef.current) clearInterval(btcTimerRef.current);
    };
  }, [fetchAll, fetchBtc]);

  // ── Actions ────────────────────────────────────────

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

  // ── Derived data (filter out SIM) ──────────────────

  const portfolio = state.status?.portfolio;
  const account = state.status?.account;
  const allPositions = state.status?.positions?.positions ?? [];
  const positions: Position[] = allPositions.filter((p) => p.venue === "polymarket");
  const allTrades = state.trades?.trades ?? [];
  const trades: Trade[] = allTrades.filter((t) => t.venue === "polymarket");
  const markets = state.markets?.markets ?? [];
  const polyPnl = state.status?.positions?.polymarket_pnl ?? 0;

  // ── Render ─────────────────────────────────────────

  return (
    <div className="min-h-screen bg-terminal text-green-dim/70 font-mono">
      {/* ─── HEADER ─────────────────────────────────────── */}
      <header className="border-b border-panel-border bg-panel/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* Brand */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-green-matrix font-bold text-sm tracking-widest animate-glow-pulse">CLAWDBOT</span>
              <span className="text-green-dim/15 text-xs">//</span>
              <span className="text-amber-warm/60 text-[0.55rem] font-bold tracking-widest">OPS</span>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-4 overflow-x-auto">
              <Stat label="USDC" value={`$${(portfolio?.balance_usdc ?? 0).toFixed(2)}`} color="text-green-matrix" />
              <Sep />
              <Stat
                label="P&L"
                value={`${polyPnl >= 0 ? "+" : ""}$${polyPnl.toFixed(2)}`}
                color={polyPnl >= 0 ? "text-green-matrix" : "text-red-alert"}
              />
              <Sep />
              <Stat label="Exposure" value={`$${(portfolio?.total_exposure ?? 0).toFixed(2)}`} color="text-amber-warm" />
              <Sep />
              <BtcWidget data={state.btc} />
              <Sep />
              <LeaderboardCard data={state.leaderboard} />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePause}
                className={`px-2.5 py-1 rounded text-[0.5rem] font-bold tracking-wider transition-all border ${
                  paused
                    ? "bg-red-alert/15 text-red-alert border-red-alert/30 hover:bg-red-alert/25"
                    : "bg-green-matrix/8 text-green-matrix/70 border-green-matrix/15 hover:bg-green-matrix/15"
                }`}
              >
                {paused ? "RESUME" : "PAUSE"}
              </button>
              <button
                onClick={handleLogout}
                className="px-2 py-1 rounded text-[0.45rem] font-bold tracking-wider text-green-dim/15 hover:text-red-alert/50 transition-all"
                title="Logout"
              >
                EXIT
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ───────────────────────────────── */}
      <main className="max-w-[1440px] mx-auto px-4 py-4 space-y-4">
        {/* Error */}
        {state.error && (
          <div className="panel p-3 border-red-alert/20">
            <span className="text-red-alert text-[0.55rem] font-bold">VPS ERROR: </span>
            <span className="text-red-alert/50 text-[0.5rem]">{state.error}</span>
          </div>
        )}

        {/* ── Row 1: Bot cards + Chart ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Bot cards - 2x2 grid */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3">
            {BOT_IDS.map((bot) => (
              <BotCard
                key={bot}
                botId={bot}
                active={state.crons?.bots?.[bot]?.active ?? false}
                log={state.logs[bot] ?? ""}
                onToggle={(enabled) => handleToggle(bot, enabled)}
                onRun={() => handleRun(bot)}
              />
            ))}
          </div>

          {/* P&L Chart */}
          <div>
            <PnlChart trades={allTrades} currentPnl={polyPnl} />

            {/* Quick stats under chart */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <MiniStat label="Positions" value={String(positions.length)} color="text-purple-fade" />
              <MiniStat label="Trades" value={String(trades.length)} color="text-cyan-glow" />
              <MiniStat
                label="Win Rate"
                value={account?.win_rate != null ? `${(account.win_rate * 100).toFixed(0)}%` : "---"}
                color="text-green-matrix"
              />
            </div>
          </div>
        </div>

        {/* ── Row 2: Positions + Recent Trades ────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <PositionsTable positions={positions} />
          <TradesTimeline trades={trades} />
        </div>

        {/* ── Row 3: Logs + Markets ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Logs */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-terminal-dark/50 border border-panel-border">
              {BOT_IDS.map((bot) => (
                <button
                  key={bot}
                  onClick={() => setLogBot(bot)}
                  className={`px-2.5 py-1 rounded text-[0.5rem] font-bold tracking-wider transition-all flex-1 ${
                    logBot === bot ? "shadow-sm" : "text-green-dim/25 hover:text-green-dim/50"
                  }`}
                  style={logBot === bot ? { backgroundColor: BOTS[bot].color + "12", color: BOTS[bot].color } : undefined}
                >
                  {BOTS[bot].emoji} {BOTS[bot].label.toUpperCase()}
                </button>
              ))}
            </div>
            <LogsTerminal botId={logBot} log={state.logs[logBot] ?? ""} />
          </div>

          {/* Markets */}
          <MarketsTable markets={markets} />
        </div>
      </main>

      {/* ─── FOOTER ──────────────────────────────────────── */}
      <footer className="border-t border-panel-border mt-6 py-2">
        <div className="max-w-[1440px] mx-auto px-4 flex items-center justify-between">
          <span className="text-[0.45rem] text-green-dim/12">
            VPS 194.163.160.76:8420 &middot; 30s refresh
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-green-matrix/40 animate-pulse" />
            <span className="text-[0.45rem] text-green-dim/12 tabular-nums">
              {state.status?.timestamp ? new Date(state.status.timestamp).toLocaleTimeString() : "---"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Tiny helper components ────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="hidden md:flex items-center gap-1.5">
      <span className="text-[0.45rem] text-green-dim/20 uppercase tracking-wider">{label}</span>
      <span className={`text-[0.7rem] font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function Sep() {
  return <div className="hidden md:block w-px h-4 bg-panel-border/50" />;
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="panel p-2.5 text-center">
      <div className="text-[0.45rem] text-green-dim/20 uppercase tracking-wider">{label}</div>
      <div className={`text-base font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
