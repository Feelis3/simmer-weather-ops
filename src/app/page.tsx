"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Header from "@/components/Header";
import PortfolioPanel from "@/components/PortfolioPanel";
import CityGrid from "@/components/CityGrid";
import PositionsTable from "@/components/PositionsTable";
import TradesTable from "@/components/TradesTable";
import StatusBar from "@/components/StatusBar";
import SystemLog, { type LogEntry } from "@/components/SystemLog";
import type { SimmerPortfolio, SimmerPositions, SimmerTrades } from "@/lib/types";
import type { PolymarketPosition, PolymarketActivity, WeatherMarketData } from "@/lib/types";

interface DashboardState {
  portfolio: { simmer: SimmerPortfolio | null; polymarket_value: number } | null;
  positions: { simmer: SimmerPositions | null; polymarket: PolymarketPosition[] } | null;
  trades: { simmer: SimmerTrades | null; polymarket: PolymarketActivity[] } | null;
  markets: WeatherMarketData[];
  lastUpdate: number;
}

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
    lastUpdate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [booted, setBooted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const fetchCount = useRef(0);

  const log = useCallback((level: LogEntry["level"], message: string) => {
    setLogs((prev) => [...prev.slice(-150), { time: ts(), message, level }]);
  }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    fetchCount.current++;
    const cycle = fetchCount.current;
    log("fetch", `Sync cycle #${cycle} starting — fetching 4 endpoints...`);

    const t0 = performance.now();

    const [portfolioRes, positionsRes, tradesRes, marketsRes] = await Promise.allSettled([
      fetch("/api/portfolio").then((r) => r.json()),
      fetch("/api/positions").then((r) => r.json()),
      fetch("/api/trades").then((r) => r.json()),
      fetch("/api/markets").then((r) => r.json()),
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
      log("success", `Trades OK — Polymarket: ${pmTrades} executions | Simmer: ${simTrades}`);
    } else {
      log("error", `Trades FAILED — ${tradesRes.reason}`);
    }

    // Log markets with per-city price details
    if (marketsRes.status === "fulfilled") {
      const markets: WeatherMarketData[] = marketsRes.value.markets ?? [];
      const cities = markets.map((m) => m.city).join(", ");
      const totalVol = markets.reduce((s, m) => s + m.volume, 0);
      log("success", `Markets OK — ${markets.length} cities: ${cities || "none"}`);
      if (markets.length > 0) {
        log("info", `Total volume: $${totalVol.toLocaleString()}`);
        markets.forEach((m) => {
          const peak = m.buckets.reduce(
            (best, b) => (b.yesPrice > best.yesPrice ? b : best),
            m.buckets[0]
          );
          if (peak) {
            const pLabel = peak.label
              .replace(/^.*?(\d)/, "$1")
              .replace(/orHigher|orLower/gi, "+")
              .replace(/F$/i, "°F");
            log("info", `  ${m.city}: peak ${pLabel} @ ${(peak.yesPrice * 100).toFixed(1)}% | vol $${(m.volume / 1000).toFixed(1)}K`);
          }
        });
      }
    } else {
      log("error", `Markets FAILED — ${marketsRes.reason}`);
    }

    log("fetch", `Sync cycle #${cycle} complete in ${elapsed}ms`);

    setState({
      portfolio: portfolioRes.status === "fulfilled" ? portfolioRes.value : null,
      positions: positionsRes.status === "fulfilled" ? positionsRes.value : null,
      trades: tradesRes.status === "fulfilled" ? tradesRes.value : null,
      markets: marketsRes.status === "fulfilled" ? marketsRes.value.markets ?? [] : [],
      lastUpdate: Date.now(),
    });

    setIsLoading(false);
  }, [log]);

  // Boot sequence
  useEffect(() => {
    const lines = [
      "SIMMER WEATHER OPS v1.0 — BOOT SEQUENCE",
      "Initializing kernel...",
      "Loading Polymarket CLOB interface...",
      "Connecting to Simmer API gateway...",
      "Wallet: 0x3925...4572",
      "Scanning weather markets: NYC, Chicago, Seattle, Atlanta, Dallas",
      "Syncing Gamma API market data...",
      "Loading temperature distribution models...",
      "Establishing data feeds...",
      "SYSTEM READY — ALL FEEDS NOMINAL",
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
    }, 150);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (booted) {
      log("info", "System boot complete — starting data feeds");
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
              <span className="text-green-matrix text-xs font-bold tracking-widest">
                SYSTEM BOOT
              </span>
            </div>
            <div className="space-y-1 font-mono text-xs">
              {bootLines.map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-green-dim/30 tabular-nums select-none">
                    {String(i).padStart(2, "0")}
                  </span>
                  <span
                    className={
                      i === bootLines.length - 1
                        ? "text-cyan-glow font-bold"
                        : "text-green-dim/70"
                    }
                  >
                    {line}
                  </span>
                  {i === bootLines.length - 1 && (
                    <span className="cursor-blink text-green-matrix">&nbsp;</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 h-0.5 bg-green-dark/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-matrix shadow-[0_0_6px_#00ff41] transition-all duration-300"
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

      <main className="flex-1 max-w-[1920px] mx-auto w-full px-4 py-6 space-y-6">
        <PortfolioPanel
          simmer={state.portfolio?.simmer ?? null}
          polymarketValue={state.portfolio?.polymarket_value ?? 0}
        />

        <CityGrid markets={state.markets} />

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
