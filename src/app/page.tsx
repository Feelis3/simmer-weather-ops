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
import { BOTS, BOT_IDS, type BotId } from "@/lib/constants";
import type {
  StatusResponse,
  TradesResponse,
  MarketsResponse,
  BtcData,
  LeaderboardData,
  CronsResponse,
} from "@/lib/types";

// ─── Types for dashboard state ─────────────────────────

interface DashboardState {
  status: StatusResponse | null;
  trades: TradesResponse | null;
  markets: MarketsResponse | null;
  btc: BtcData | null;
  leaderboard: LeaderboardData | null;
  crons: CronsResponse | null;
  logs: Record<string, string>;
  loading: boolean;
  error: string | null;
}

// ─── Section navigation ────────────────────────────────

const SECTIONS = ["BOTS", "POSITIONS", "TRADES", "LOGS", "MARKETS"] as const;
type Section = (typeof SECTIONS)[number];

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
    loading: true,
    error: null,
  });
  const [section, setSection] = useState<Section>("BOTS");
  const [logBot, setLogBot] = useState<BotId>("weather");
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const btcTimerRef = useRef<ReturnType<typeof setInterval>>(null);
  const router = useRouter();

  // ── Fetch everything ───────────────────────────────

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
        loading: false,
        error: null,
      }));
    } catch (e) {
      setState((prev) => ({ ...prev, loading: false, error: String(e) }));
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

  // ── Bot actions ────────────────────────────────────

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

  // ── Derived data ───────────────────────────────────

  const portfolio = state.status?.portfolio;
  const account = state.status?.account;
  const positions = state.status?.positions?.positions ?? [];
  const trades = state.trades?.trades ?? [];
  const markets = state.markets?.markets ?? [];

  // ── Boot sequence ──────────────────────────────────

  if (state.loading && !state.status) {
    return (
      <div className="min-h-screen bg-terminal flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-green-matrix font-mono text-sm animate-glow-pulse">CLAWDBOT // OPS</div>
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-green-matrix/50 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
          <p className="text-green-dim/30 text-[0.6rem] font-mono">Connecting to VPS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-terminal text-green-dim/70 font-mono">
      {/* ─── TOP BAR ───────────────────────────────────── */}
      <header className="border-b border-panel-border bg-panel/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: branding */}
            <div className="flex items-center gap-3">
              <span className="text-green-matrix font-bold text-sm tracking-widest animate-glow-pulse">CLAWDBOT</span>
              <span className="text-green-dim/20 text-xs">//</span>
              <span className="text-amber-warm/70 text-[0.6rem] font-bold tracking-widest">OPS</span>
            </div>

            {/* Center: stats */}
            <div className="hidden md:flex items-center gap-5">
              <div className="text-center">
                <div className="text-[0.5rem] text-green-dim/25 uppercase tracking-wider">USDC</div>
                <div className="text-sm font-bold text-green-matrix tabular-nums">${(portfolio?.balance_usdc ?? 0).toFixed(2)}</div>
              </div>
              <div className="w-px h-6 bg-panel-border" />
              <div className="text-center">
                <div className="text-[0.5rem] text-green-dim/25 uppercase tracking-wider">$SIM</div>
                <div className="text-sm font-bold text-green-dim/40 tabular-nums">${(account?.balance ?? 0).toFixed(0)}</div>
              </div>
              <div className="w-px h-6 bg-panel-border" />
              <div className="text-center">
                <div className="text-[0.5rem] text-green-dim/25 uppercase tracking-wider">P&L Total</div>
                <div className={`text-sm font-bold tabular-nums ${(portfolio?.pnl_total ?? 0) >= 0 ? "text-green-matrix" : "text-red-alert"}`}>
                  {(portfolio?.pnl_total ?? 0) >= 0 ? "+" : ""}${(portfolio?.pnl_total ?? 0).toFixed(2)}
                </div>
              </div>
              <div className="w-px h-6 bg-panel-border" />
              <BtcWidget data={state.btc} />
            </div>

            {/* Right: pause + leaderboard */}
            <div className="flex items-center gap-3">
              <LeaderboardCard data={state.leaderboard} />
              <button
                onClick={handlePause}
                className={`px-3 py-1.5 rounded-md text-[0.55rem] font-bold tracking-wider transition-all border ${
                  paused
                    ? "bg-red-alert/15 text-red-alert border-red-alert/30 hover:bg-red-alert/25"
                    : "bg-green-matrix/10 text-green-matrix border-green-matrix/20 hover:bg-green-matrix/20"
                }`}
              >
                {paused ? "RESUME ALL" : "PAUSE ALL"}
              </button>
              <button
                onClick={handleLogout}
                className="px-2 py-1.5 rounded-md text-[0.5rem] font-bold tracking-wider transition-all text-green-dim/20 hover:text-red-alert/60 hover:bg-red-alert/5"
                title="Logout"
              >
                EXIT
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── MOBILE STATS ──────────────────────────────── */}
      <div className="md:hidden border-b border-panel-border bg-panel/50 px-4 py-2">
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="text-[0.45rem] text-green-dim/25 uppercase">USDC</div>
            <div className="text-xs font-bold text-green-matrix tabular-nums">${(portfolio?.balance_usdc ?? 0).toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-[0.45rem] text-green-dim/25 uppercase">P&L</div>
            <div className={`text-xs font-bold tabular-nums ${(portfolio?.pnl_total ?? 0) >= 0 ? "text-green-matrix" : "text-red-alert"}`}>
              {(portfolio?.pnl_total ?? 0) >= 0 ? "+" : ""}${(portfolio?.pnl_total ?? 0).toFixed(2)}
            </div>
          </div>
          <BtcWidget data={state.btc} />
        </div>
      </div>

      {/* ─── SECTION NAV ───────────────────────────────── */}
      <nav className="border-b border-panel-border bg-terminal-dark/50 sticky top-[52px] z-40">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`px-4 py-2 rounded-md text-[0.55rem] font-bold tracking-wider transition-all whitespace-nowrap ${
                  section === s
                    ? "bg-green-matrix/10 text-green-matrix shadow-sm"
                    : "text-green-dim/30 hover:text-green-dim/60 hover:bg-green-dim/5"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ─── CONTENT ───────────────────────────────────── */}
      <main className="max-w-[1400px] mx-auto px-4 py-4 space-y-4">
        {/* Error banner */}
        {state.error && (
          <div className="panel p-3 border-red-alert/30 bg-red-alert/5">
            <p className="text-red-alert text-[0.6rem] font-bold">VPS CONNECTION ERROR</p>
            <p className="text-red-alert/50 text-[0.5rem] mt-1">{state.error}</p>
          </div>
        )}

        {/* BOTS section */}
        {section === "BOTS" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
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

            {/* Quick overview stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="panel p-3">
                <div className="text-[0.5rem] text-green-dim/25 uppercase tracking-wider">Exposure</div>
                <div className="text-lg font-bold text-amber-warm tabular-nums">${(portfolio?.total_exposure ?? 0).toFixed(2)}</div>
              </div>
              <div className="panel p-3">
                <div className="text-[0.5rem] text-green-dim/25 uppercase tracking-wider">Open Positions</div>
                <div className="text-lg font-bold text-purple-fade tabular-nums">{portfolio?.positions_count ?? 0}</div>
              </div>
              <div className="panel p-3">
                <div className="text-[0.5rem] text-green-dim/25 uppercase tracking-wider">Total Trades</div>
                <div className="text-lg font-bold text-cyan-glow tabular-nums">{account?.trades_count ?? 0}</div>
              </div>
              <div className="panel p-3">
                <div className="text-[0.5rem] text-green-dim/25 uppercase tracking-wider">Win Rate</div>
                <div className="text-lg font-bold text-green-matrix tabular-nums">
                  {account?.win_rate != null ? `${(account.win_rate * 100).toFixed(0)}%` : "---"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* POSITIONS section */}
        {section === "POSITIONS" && (
          <PositionsTable positions={positions} />
        )}

        {/* TRADES section */}
        {section === "TRADES" && (
          <TradesTimeline trades={trades} />
        )}

        {/* LOGS section */}
        {section === "LOGS" && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-terminal-dark/50 border border-panel-border">
              {BOT_IDS.map((bot) => (
                <button
                  key={bot}
                  onClick={() => setLogBot(bot)}
                  className={`px-3 py-1.5 rounded-md text-[0.55rem] font-bold tracking-wider transition-all ${
                    logBot === bot
                      ? "shadow-sm"
                      : "text-green-dim/30 hover:text-green-dim/60 hover:bg-green-dim/5"
                  }`}
                  style={logBot === bot ? { backgroundColor: BOTS[bot].color + "15", color: BOTS[bot].color } : undefined}
                >
                  {BOTS[bot].emoji} {BOTS[bot].label.toUpperCase()}
                </button>
              ))}
            </div>
            <LogsTerminal botId={logBot} log={state.logs[logBot] ?? ""} />
          </div>
        )}

        {/* MARKETS section */}
        {section === "MARKETS" && (
          <MarketsTable markets={markets} />
        )}
      </main>

      {/* ─── FOOTER ────────────────────────────────────── */}
      <footer className="border-t border-panel-border mt-8 py-3">
        <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between">
          <span className="text-[0.5rem] text-green-dim/15">
            VPS 194.163.160.76:8420 &middot; 30s refresh &middot; {BOT_IDS.length} bots active
          </span>
          <span className="text-[0.5rem] text-green-dim/15 tabular-nums">
            {state.status?.timestamp ? new Date(state.status.timestamp).toLocaleTimeString() : "---"}
          </span>
        </div>
      </footer>
    </div>
  );
}
