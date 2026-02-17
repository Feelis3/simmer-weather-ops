"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Header from "@/components/Header";
import OverviewPanel from "@/components/OverviewPanel";
import CityGrid from "@/components/CityGrid";
import ExecutionsLog from "@/components/ExecutionsLog";
import PositionsTable from "@/components/PositionsTable";
import TradesTable from "@/components/TradesTable";
import StatusBar from "@/components/StatusBar";
import SystemLog, { type LogEntry } from "@/components/SystemLog";
import type {
  PolymarketPosition, PolymarketActivity, WeatherMarketData,
  DivergenceOpportunity,
  Execution,
} from "@/lib/types";

interface DashboardState {
  portfolio: {
    portfolio_value: number;
    total_pnl: number;
    total_exposure: number;
    positions_count: number;
  } | null;
  positions: PolymarketPosition[];
  trades: PolymarketActivity[];
  markets: WeatherMarketData[];
  divergence: DivergenceOpportunity[];
  lastUpdate: number;
}

type TabKey = "overview" | "weather" | "executions";

const TABS: { key: TabKey; label: string; color: string }[] = [
  { key: "overview", label: "OVERVIEW", color: "text-green-matrix" },
  { key: "weather", label: "WEATHER", color: "text-green-matrix" },
  { key: "executions", label: "EXECUTIONS", color: "text-amber-warm" },
];

function ts() {
  return new Date().toLocaleTimeString("en-US", { hour12: false }) +
    "." + String(new Date().getMilliseconds()).padStart(3, "0");
}

export default function Dashboard() {
  const [state, setState] = useState<DashboardState>({
    portfolio: null,
    positions: [],
    trades: [],
    markets: [],
    divergence: [],
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
    log("fetch", `Sync cycle #${cycle} starting — fetching endpoints...`);

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
    if (portfolioRes.status === "fulfilled" && !portfolioRes.value.error) {
      const p = portfolioRes.value;
      log("success", `Portfolio OK — Value: $${(p.portfolio_value ?? 0).toFixed(2)} | P&L: $${(p.total_pnl ?? 0).toFixed(2)}`);
    } else {
      log("error", `Portfolio FAILED — ${portfolioRes.status === "rejected" ? portfolioRes.reason : portfolioRes.value?.error}`);
    }

    // Log positions
    if (positionsRes.status === "fulfilled") {
      const count = positionsRes.value.positions?.length ?? 0;
      log("success", `Positions OK — ${count} active positions`);
    } else {
      log("error", `Positions FAILED — ${positionsRes.reason}`);
    }

    // Log trades
    if (tradesRes.status === "fulfilled") {
      const tradeCount = (tradesRes.value.activity ?? []).filter(
        (t: PolymarketActivity) => t.type === "TRADE"
      ).length;
      log("success", `Trades OK — ${tradeCount} trades`);
    } else {
      log("error", `Trades FAILED — ${tradesRes.reason}`);
    }

    // Log markets
    if (marketsRes.status === "fulfilled") {
      const markets: WeatherMarketData[] = marketsRes.value.markets ?? [];
      const cities = markets.map((m) => m.city).join(", ");
      log("success", `Markets OK — ${markets.length} cities: ${cities || "none"}`);
      if (markets.length > 0) {
        const totalVol = markets.reduce((s, m) => s + m.volume, 0);
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

    // Log divergence
    if (briefingRes.status === "fulfilled") {
      const divCount = briefingRes.value.divergence?.length ?? 0;
      log("success", `Divergence OK — ${divCount} opportunities from VPS`);
    } else {
      log("warn", `Divergence — endpoint unavailable`);
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
      portfolio: portfolioRes.status === "fulfilled" && !portfolioRes.value.error ? portfolioRes.value : null,
      positions: positionsRes.status === "fulfilled" ? positionsRes.value.positions ?? [] : [],
      trades: tradesRes.status === "fulfilled" ? tradesRes.value.activity ?? [] : [],
      markets: marketsRes.status === "fulfilled" ? marketsRes.value.markets ?? [] : [],
      divergence: briefingRes.status === "fulfilled" ? briefingRes.value.divergence ?? [] : [],
      lastUpdate: Date.now(),
    });

    setIsLoading(false);
  }, [log]);

  // Boot sequence
  useEffect(() => {
    const lines = [
      "CLAWDBOT OPS v2.0 — BOOT SEQUENCE",
      "Initializing kernel...",
      "Loading Polymarket CLOB interface...",
      "Wallet: 0x3925...4572",
      "Syncing Gamma API market data...",
      "Loading weather markets...",
      "Connecting to VPS 194.163.160.76:8899...",
      "Loading execution logs from server...",
      "Establishing data feeds...",
      "SYSTEM READY — LIVE DATA ACTIVE",
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
      log("info", "System boot complete — live data mode");
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
                style={{ width: `${(bootLines.length / 10) * 100}%` }}
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
              portfolio={state.portfolio}
              positions={state.positions}
              trades={state.trades}
            />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <PositionsTable positions={state.positions} />
              <TradesTable trades={state.trades} />
            </div>
          </>
        )}

        {/* WEATHER tab */}
        {activeTab === "weather" && (
          <CityGrid markets={state.markets} />
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
