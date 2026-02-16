"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Header from "@/components/Header";
import OverviewPanel from "@/components/OverviewPanel";
import CityGrid from "@/components/CityGrid";
import CopytradingSection from "@/components/CopytradingSection";
import DivergenceSection from "@/components/DivergenceSection";
import ExecutionsLog from "@/components/ExecutionsLog";
import PositionsTable from "@/components/PositionsTable";
import TradesTable from "@/components/TradesTable";
import StatusBar from "@/components/StatusBar";
import SystemLog, { type LogEntry } from "@/components/SystemLog";
import type {
  SimmerPortfolio, SimmerPositions, SimmerTrades, SimmerBriefing,
  PolymarketPosition, PolymarketActivity, WeatherMarketData,
  DivergenceOpportunity,
  SimmerPosition, SimmerTrade,
  Execution,
} from "@/lib/types";
import { STRATEGIES } from "@/lib/types";

interface DashboardState {
  portfolio: { simmer: SimmerPortfolio | null; polymarket_value: number } | null;
  positions: { simmer: SimmerPositions | null; polymarket: PolymarketPosition[] } | null;
  trades: { simmer: SimmerTrades | null; polymarket: PolymarketActivity[] } | null;
  markets: WeatherMarketData[];
  briefing: SimmerBriefing | null;
  lastUpdate: number;
}

type TabKey = "overview" | "weather" | "copytrading" | "divergence" | "executions";

const TABS: { key: TabKey; label: string; color: string }[] = [
  { key: "overview", label: "OVERVIEW", color: "text-green-matrix" },
  { key: "weather", label: "WEATHER", color: "text-green-matrix" },
  { key: "copytrading", label: "COPYTRADING", color: "text-cyan-glow" },
  { key: "divergence", label: "AI DIVERGENCE", color: "text-purple-fade" },
  { key: "executions", label: "EXECUTIONS", color: "text-amber-warm" },
];

function ts() {
  return new Date().toLocaleTimeString("en-US", { hour12: false }) +
    "." + String(new Date().getMilliseconds()).padStart(3, "0");
}

export default function Dashboard() {
  const [state, setState] = useState<DashboardState>({
    portfolio: null,
    positions: null,
    trades: null,
    markets: [],
    briefing: null,
    lastUpdate: 0,
  });
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [booted, setBooted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const fetchCount = useRef(0);

  const log = useCallback((level: LogEntry["level"], message: string) => {
    setLogs((prev) => [...prev.slice(-150), { time: ts(), message, level }]);
  }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    fetchCount.current++;
    const cycle = fetchCount.current;
    log("fetch", `Sync cycle #${cycle} starting — fetching 6 endpoints...`);

    const t0 = performance.now();

    const [portfolioRes, positionsRes, tradesRes, marketsRes, briefingRes, executionsRes] = await Promise.allSettled([
      fetch("/api/portfolio").then((r) => r.json()),
      fetch("/api/positions").then((r) => r.json()),
      fetch("/api/trades").then((r) => r.json()),
      fetch("/api/markets").then((r) => r.json()),
      fetch("/api/briefing").then((r) => r.json()),
      fetch("/api/executions").then((r) => r.json()),
    ]);

    const elapsed = Math.round(performance.now() - t0);

    // Log portfolio
    if (portfolioRes.status === "fulfilled") {
      const p = portfolioRes.value;
      const bal = p.simmer?.balance_usdc?.toFixed(2) ?? "?";
      const pmv = p.polymarket_value?.toFixed(2) ?? "0";
      log("success", `Portfolio OK — Simmer: $${bal} | Polymarket: $${pmv}`);
    } else {
      log("error", `Portfolio FAILED — ${portfolioRes.reason}`);
    }

    // Log positions
    if (positionsRes.status === "fulfilled") {
      const pmCount = positionsRes.value.polymarket?.length ?? 0;
      const simCount = positionsRes.value.simmer?.positions?.length ?? 0;
      log("success", `Positions OK — Polymarket: ${pmCount} | Simmer: ${simCount}`);
    } else {
      log("error", `Positions FAILED — ${positionsRes.reason}`);
    }

    // Log trades
    if (tradesRes.status === "fulfilled") {
      const pmTrades = (tradesRes.value.polymarket ?? []).filter(
        (t: PolymarketActivity) => t.type === "TRADE"
      ).length;
      const simTrades = tradesRes.value.simmer?.total_count ?? 0;
      log("success", `Trades OK — Polymarket: ${pmTrades} | Simmer: ${simTrades}`);
    } else {
      log("error", `Trades FAILED — ${tradesRes.reason}`);
    }

    // Log markets
    if (marketsRes.status === "fulfilled") {
      const markets: WeatherMarketData[] = marketsRes.value.markets ?? [];
      const cities = markets.map((m) => m.city).join(", ");
      const totalVol = markets.reduce((s, m) => s + m.volume, 0);
      log("success", `Markets OK — ${markets.length} cities: ${cities || "none"}`);
      if (markets.length > 0) {
        log("info", `Total weather volume: $${totalVol.toLocaleString()}`);
        markets.forEach((m) => {
          const peak = m.buckets.reduce((best, b) => (b.yesPrice > best.yesPrice ? b : best), m.buckets[0]);
          if (peak) {
            const pLabel = peak.label.replace(/^.*?(\d)/, "$1").replace(/orHigher|orLower/gi, "+").replace(/F$/i, "°F");
            log("info", `  ${m.city}: peak ${pLabel} @ ${(peak.yesPrice * 100).toFixed(1)}%`);
          }
        });
      }
    } else {
      log("error", `Markets FAILED — ${marketsRes.reason}`);
    }

    // Log briefing
    if (briefingRes.status === "fulfilled" && briefingRes.value.briefing) {
      const b = briefingRes.value.briefing;
      const divCount = b.opportunities?.high_divergence?.length ?? 0;
      const alerts = b.risk_alerts?.length ?? 0;
      log("success", `Briefing OK — ${divCount} divergence opportunities | ${alerts} risk alerts`);
      if (b.performance) {
        log("info", `  Win rate: ${(b.performance.win_rate * 100).toFixed(1)}% | Avg return: ${(b.performance.avg_return * 100).toFixed(1)}%`);
      }
    } else {
      log("warn", `Briefing — no data or endpoint unavailable`);
    }

    // Log executions
    if (executionsRes.status === "fulfilled") {
      const execs: Execution[] = executionsRes.value.executions ?? [];
      setExecutions(execs);
      const latest = execs.length > 0 ? execs[execs.length - 1] : null;
      log("success", `Executions OK — ${execs.length} entries from VPS`);
      if (latest) {
        log("info", `  Latest: [${latest.strategy}] ${latest.status} @ ${new Date(latest.ts).toLocaleTimeString("en-US", { hour12: false })}`);
      }
    } else {
      log("warn", `Executions — VPS endpoint unavailable`);
    }

    log("fetch", `Sync cycle #${cycle} complete in ${elapsed}ms`);

    setState({
      portfolio: portfolioRes.status === "fulfilled" ? portfolioRes.value : null,
      positions: positionsRes.status === "fulfilled" ? positionsRes.value : null,
      trades: tradesRes.status === "fulfilled" ? tradesRes.value : null,
      markets: marketsRes.status === "fulfilled" ? marketsRes.value.markets ?? [] : [],
      briefing: briefingRes.status === "fulfilled" ? briefingRes.value.briefing ?? null : null,
      lastUpdate: Date.now(),
    });

    setIsLoading(false);
  }, [log]);

  // Filter positions/trades by strategy
  const allSimmerPositions: SimmerPosition[] = state.positions?.simmer?.positions ?? [];
  const allSimmerTrades: SimmerTrade[] = state.trades?.simmer?.trades ?? [];

  const copyPositions = useMemo(() => allSimmerPositions.filter((p) => p.source === STRATEGIES.COPYTRADING), [allSimmerPositions]);
  const copyTrades = useMemo(() => allSimmerTrades.filter((t) => t.source === STRATEGIES.COPYTRADING), [allSimmerTrades]);
  const divPositions = useMemo(() => allSimmerPositions.filter((p) => p.source === STRATEGIES.AI_DIVERGENCE), [allSimmerPositions]);
  const divTrades = useMemo(() => allSimmerTrades.filter((t) => t.source === STRATEGIES.AI_DIVERGENCE), [allSimmerTrades]);

  const bySource = state.portfolio?.simmer?.by_source ?? {};
  const copyPnl = (bySource[STRATEGIES.COPYTRADING] as { pnl?: number } | undefined)?.pnl ?? 0;
  const divPnl = (bySource[STRATEGIES.AI_DIVERGENCE] as { pnl?: number } | undefined)?.pnl ?? 0;
  const divergenceOpps: DivergenceOpportunity[] = state.briefing?.opportunities?.high_divergence ?? [];

  // Boot sequence
  useEffect(() => {
    const lines = [
      "SIMMER WEATHER OPS v2.0 — BOOT SEQUENCE",
      "Initializing kernel...",
      "Loading Polymarket CLOB interface...",
      "Connecting to Simmer API gateway...",
      "Wallet: 0x3925...4572",
      "Loading strategies: weather, copytrading, ai-divergence",
      "Syncing Gamma API market data...",
      "Scanning whale wallets for copytrading...",
      "Initializing AI divergence scanner...",
      "Fetching briefing and opportunities...",
      "Connecting to VPS 194.163.160.76:8899...",
      "Loading execution logs from server...",
      "Establishing data feeds...",
      "SYSTEM READY — ALL STRATEGIES ACTIVE",
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < lines.length) {
        setBootLines((prev) => [...prev, lines[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setBooted(true), 400);
      }
    }, 130);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (booted) {
      log("info", "System boot complete — all strategies loaded");
      log("info", "Auto-refresh interval: 30s");
      fetchAll();
      const interval = setInterval(fetchAll, 30000);
      return () => clearInterval(interval);
    }
  }, [booted, fetchAll, log]);

  // Boot screen
  if (!booted) {
    return (
      <div className="min-h-screen bg-terminal-dark flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-matrix shadow-[0_0_8px_#00ff41] animate-pulse" />
              <span className="text-green-matrix text-xs font-bold tracking-widest">SYSTEM BOOT</span>
            </div>
            <div className="space-y-1 font-mono text-xs">
              {bootLines.map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-green-dim/30 tabular-nums select-none">{String(i).padStart(2, "0")}</span>
                  <span className={i === bootLines.length - 1 ? "text-cyan-glow font-bold" : "text-green-dim/70"}>
                    {line}
                  </span>
                  {i === bootLines.length - 1 && <span className="cursor-blink text-green-matrix">&nbsp;</span>}
                </div>
              ))}
            </div>
            <div className="mt-4 h-0.5 bg-green-dark/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-matrix shadow-[0_0_6px_#39ff7f] transition-all duration-300"
                style={{ width: `${(bootLines.length / 14) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Tab navigation */}
      <div className="border-b border-panel-border bg-terminal-dark/80 backdrop-blur-sm">
        <div className="max-w-[1920px] mx-auto px-5 flex items-center gap-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-3 text-[0.6rem] font-bold tracking-widest uppercase transition-all ${
                activeTab === tab.key
                  ? `${tab.color}`
                  : "text-green-dim/20 hover:text-green-dim/40"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-current" />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-[1920px] mx-auto w-full px-5 py-6 space-y-5">
        {/* OVERVIEW tab */}
        {activeTab === "overview" && (
          <>
            <OverviewPanel
              simmer={state.portfolio?.simmer ?? null}
              polymarketValue={state.portfolio?.polymarket_value ?? 0}
              trades={allSimmerTrades}
            />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <PositionsTable
                polymarket={state.positions?.polymarket ?? []}
                simmer={state.positions?.simmer ?? null}
              />
              <TradesTable
                polymarket={state.trades?.polymarket ?? []}
                simmer={state.trades?.simmer ?? null}
              />
            </div>
          </>
        )}

        {/* WEATHER tab */}
        {activeTab === "weather" && (
          <CityGrid markets={state.markets} />
        )}

        {/* COPYTRADING tab */}
        {activeTab === "copytrading" && (
          <CopytradingSection
            positions={copyPositions}
            trades={copyTrades}
            pnl={copyPnl}
          />
        )}

        {/* AI DIVERGENCE tab */}
        {activeTab === "divergence" && (
          <DivergenceSection
            opportunities={divergenceOpps}
            positions={divPositions}
            trades={divTrades}
            pnl={divPnl}
          />
        )}

        {/* EXECUTIONS tab */}
        {activeTab === "executions" && (
          <ExecutionsLog executions={executions} />
        )}

        {/* System log always visible */}
        <SystemLog entries={logs} />
      </main>

      <StatusBar
        lastUpdate={state.lastUpdate}
        isLoading={isLoading}
        onRefresh={fetchAll}
      />
    </div>
  );
}
