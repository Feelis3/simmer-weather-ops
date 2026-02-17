"use client";

import { useState, useMemo } from "react";
import type { Execution } from "@/lib/types";

interface Props {
  executions: Execution[];
}

const PAGE_SIZE = 10;

const STRATEGY_STYLES: Record<string, { color: string; bg: string; border: string; glow: string; label: string; icon: string }> = {
  weather: { color: "text-green-matrix", bg: "bg-green-matrix/8", border: "border-green-matrix/20", glow: "#39ff7f", label: "WEATHER", icon: "W" },
  copytrading: { color: "text-cyan-glow", bg: "bg-cyan-glow/8", border: "border-cyan-glow/20", glow: "#22d3ee", label: "COPYTRADING", icon: "C" },
  "ai-divergence": { color: "text-purple-fade", bg: "bg-purple-fade/8", border: "border-purple-fade/20", glow: "#a78bfa", label: "AI DIVERGENCE", icon: "D" },
};

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 0) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ─── Data parsers ──────────────────────────────────────────

interface DivergenceItem {
  question: string;
  current_probability: number;
  external_price_yes: number;
  divergence: number;
  volume_24h: number | null;
  status: string;
  outcome: boolean | null;
  url?: string;
}

function parseDivergenceOutput(output: string): { items: DivergenceItem[]; traded: boolean } | null {
  try {
    const traded = output.includes("---TRADE---");
    let depth = 0;
    let start = -1;
    let end = -1;
    for (let i = 0; i < output.length; i++) {
      if (output[i] === "[" && depth === 0) { start = i; depth++; }
      else if (output[i] === "[") depth++;
      else if (output[i] === "]") { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (start === -1 || end === -1) {
      const bracketStart = output.indexOf("[");
      if (bracketStart === -1) return null;
      const lastObjEnd = output.lastIndexOf("}");
      if (lastObjEnd === -1) return null;
      const jsonStr = output.substring(bracketStart, lastObjEnd + 1) + "]";
      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question) {
          return { items: parsed, traded };
        }
      } catch { /* fall through */ }
      return null;
    }
    const jsonStr = output.substring(start, end);
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (!parsed[0].question) return null;
    return { items: parsed as DivergenceItem[], traded };
  } catch {
    return null;
  }
}

interface CopytradingData {
  walletsAnalyzed: number;
  positionsFound: number;
  conflictsSkipped: number;
  topN: number;
  maxPerPosition: string;
  matched: boolean;
}

function parseCopytradingOutput(output: string): CopytradingData | null {
  const walletsMatch = output.match(/Wallets analyzed:\s*(\d+)/);
  const posMatch = output.match(/Positions found:\s*(\d+)/);
  const conflictsMatch = output.match(/Conflicts skipped:\s*(\d+)/);
  const topNMatch = output.match(/Top N used:\s*(\d+)/);
  const maxMatch = output.match(/Max per position:\s*(\$[0-9.]+)/);
  const noMatch = output.includes("No target positions could be matched");

  if (!walletsMatch && !posMatch) return null;

  return {
    walletsAnalyzed: walletsMatch ? parseInt(walletsMatch[1]) : 0,
    positionsFound: posMatch ? parseInt(posMatch[1]) : 0,
    conflictsSkipped: conflictsMatch ? parseInt(conflictsMatch[1]) : 0,
    topN: topNMatch ? parseInt(topNMatch[1]) : 0,
    maxPerPosition: maxMatch ? maxMatch[1] : "$1.00",
    matched: !noMatch,
  };
}

interface WeatherData {
  sizing: string;
  balance: string;
  pct: string;
  traded: boolean;
}

function parseWeatherOutput(output: string): WeatherData | null {
  const sizingMatch = output.match(/Smart sizing:\s*\$([0-9.]+)\s*\((\d+)%\s*of\s*\$([0-9.]+)\s*balance\)/);
  if (sizingMatch) {
    const traded = output.includes("---TRADE---") || output.includes("Executed") || output.includes("Bought") || output.includes("Order placed");
    return {
      sizing: sizingMatch[1],
      pct: sizingMatch[2],
      balance: sizingMatch[3],
      traded,
    };
  }
  const trimmed = output.trim();
  if (trimmed.length === 0) return { sizing: "0", pct: "0", balance: "?", traded: false };
  return null;
}

// ─── Sub-components ────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const isOk = status === "ok" || status === "success";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.5rem] font-bold uppercase tracking-wider ${
        isOk
          ? "bg-green-matrix/10 text-green-matrix"
          : "bg-red-alert/10 text-red-alert"
      }`}
    >
      <span className={`w-1 h-1 rounded-full ${isOk ? "bg-green-matrix" : "bg-red-alert"}`} />
      {isOk ? "OK" : status.toUpperCase()}
    </span>
  );
}

function TradeBadge({ traded }: { traded: boolean }) {
  if (!traded) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.5rem] font-bold uppercase tracking-wider bg-green-dim/5 text-green-dim/30">
        SCAN ONLY
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.5rem] font-bold uppercase tracking-wider bg-amber-warm/15 text-amber-warm animate-pulse">
      TRADED
    </span>
  );
}

function DivergenceTable({ data }: { data: { items: DivergenceItem[]; traded: boolean } }) {
  const sorted = [...data.items].sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence));
  const top = sorted.slice(0, 6);

  return (
    <div className="mt-2 rounded-lg border border-purple-fade/10 bg-purple-fade/[0.02] overflow-hidden">
      <div className="px-3 py-1.5 bg-purple-fade/5 border-b border-purple-fade/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[0.6rem] text-purple-fade/70 font-bold uppercase tracking-wider">
            {data.items.length} opportunities scanned
          </span>
          <TradeBadge traded={data.traded} />
        </div>
        <span className="text-[0.5rem] text-green-dim/25">top {top.length} by divergence</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-green-dim/8">
              <th className="text-left text-[0.55rem] text-green-dim/40 font-medium px-3 py-1.5 uppercase tracking-wider">Market</th>
              <th className="text-right text-[0.55rem] text-green-dim/40 font-medium px-2 py-1.5 uppercase tracking-wider">Simmer</th>
              <th className="text-right text-[0.55rem] text-green-dim/40 font-medium px-2 py-1.5 uppercase tracking-wider">Poly</th>
              <th className="text-right text-[0.55rem] text-green-dim/40 font-medium px-2 py-1.5 uppercase tracking-wider">Div</th>
              <th className="text-right text-[0.55rem] text-green-dim/40 font-medium px-2 py-1.5 uppercase tracking-wider">Vol 24h</th>
              <th className="text-center text-[0.55rem] text-green-dim/40 font-medium px-2 py-1.5 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {top.map((item, i) => {
              const divAbs = Math.abs(item.divergence * 100);
              const divPct = item.divergence * 100;
              const shortQ = item.question
                .replace(/^(Bitcoin|Ethereum|Solana|XRP)\s+Up or Down\s*-\s*/, "$1 ")
                .replace(/February\s+\d+,\s*/, "");
              return (
                <tr key={i} className={`border-b border-green-dim/5 last:border-b-0 ${divAbs > 15 ? "bg-purple-fade/5" : ""}`}>
                  <td className="text-[0.6rem] text-green-dim/70 max-w-[180px] truncate px-3 py-1.5 font-mono" title={item.question}>
                    {shortQ}
                  </td>
                  <td className="text-[0.6rem] text-purple-fade tabular-nums text-right px-2 py-1.5 font-bold">
                    {(item.current_probability * 100).toFixed(1)}%
                  </td>
                  <td className="text-[0.6rem] text-cyan-glow tabular-nums text-right px-2 py-1.5">
                    {(item.external_price_yes * 100).toFixed(1)}%
                  </td>
                  <td className="text-right px-2 py-1.5">
                    <span className={`text-[0.6rem] tabular-nums font-bold ${
                      divAbs > 15 ? "text-amber-warm" : divAbs > 8 ? "text-green-matrix" : "text-green-dim/40"
                    }`}>
                      {divPct > 0 ? "+" : ""}{divPct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-[0.6rem] text-green-dim/35 tabular-nums text-right px-2 py-1.5">
                    {item.volume_24h != null ? `$${item.volume_24h.toFixed(0)}` : "—"}
                  </td>
                  <td className="text-center px-2 py-1.5">
                    {item.outcome === true ? (
                      <span className="text-[0.55rem] text-green-matrix font-bold">YES</span>
                    ) : item.outcome === false ? (
                      <span className="text-[0.55rem] text-red-alert font-bold">NO</span>
                    ) : (
                      <span className="text-[0.55rem] text-amber-warm/40">OPEN</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.items.length > top.length && (
        <div className="px-3 py-1 bg-green-dim/[0.02] border-t border-green-dim/5">
          <span className="text-[0.5rem] text-green-dim/20">
            +{data.items.length - top.length} more below threshold
          </span>
        </div>
      )}
    </div>
  );
}

function CopytradingSummary({ data }: { data: CopytradingData }) {
  return (
    <div className="mt-2 rounded-lg border border-cyan-glow/10 bg-cyan-glow/[0.02] overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-[0.7rem] text-cyan-glow font-bold tabular-nums leading-none">{data.walletsAnalyzed}</div>
            <div className="text-[0.45rem] text-green-dim/30 uppercase tracking-wider mt-0.5">Wallets</div>
          </div>
          <div className="w-px h-5 bg-green-dim/10" />
          <div className="text-center">
            <div className="text-[0.7rem] text-cyan-glow font-bold tabular-nums leading-none">{data.positionsFound}</div>
            <div className="text-[0.45rem] text-green-dim/30 uppercase tracking-wider mt-0.5">Positions</div>
          </div>
          <div className="w-px h-5 bg-green-dim/10" />
          <div className="text-center">
            <div className="text-[0.7rem] text-amber-warm/70 font-bold tabular-nums leading-none">{data.conflictsSkipped}</div>
            <div className="text-[0.45rem] text-green-dim/30 uppercase tracking-wider mt-0.5">Conflicts</div>
          </div>
          <div className="w-px h-5 bg-green-dim/10" />
          <div className="text-center">
            <div className="text-[0.7rem] text-green-dim/50 font-bold tabular-nums leading-none">{data.topN}</div>
            <div className="text-[0.45rem] text-green-dim/30 uppercase tracking-wider mt-0.5">Top N</div>
          </div>
        </div>
        <div className="w-px h-5 bg-green-dim/8" />
        {data.matched ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[0.55rem] font-bold bg-green-matrix/10 text-green-matrix">
            <span className="w-1 h-1 rounded-full bg-green-matrix" />
            MATCHED — executing trades
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[0.55rem] bg-green-dim/5 text-green-dim/35">
            <span className="w-1 h-1 rounded-full bg-green-dim/30" />
            No matchable positions
          </span>
        )}
      </div>
    </div>
  );
}

function WeatherSummary({ data }: { data: WeatherData }) {
  return (
    <div className="mt-2 rounded-lg border border-green-matrix/10 bg-green-matrix/[0.02] overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="text-center">
            <div className="text-[0.75rem] text-green-matrix font-bold tabular-nums leading-none">${data.sizing}</div>
            <div className="text-[0.45rem] text-green-dim/30 uppercase tracking-wider mt-0.5">Bet Size</div>
          </div>
          <div className="w-px h-5 bg-green-dim/10" />
          <div className="text-center">
            <div className="text-[0.7rem] text-green-dim/50 font-bold tabular-nums leading-none">{data.pct}%</div>
            <div className="text-[0.45rem] text-green-dim/30 uppercase tracking-wider mt-0.5">of Balance</div>
          </div>
          <div className="w-px h-5 bg-green-dim/10" />
          <div className="text-center">
            <div className="text-[0.7rem] text-green-dim/40 tabular-nums leading-none">${data.balance}</div>
            <div className="text-[0.45rem] text-green-dim/30 uppercase tracking-wider mt-0.5">Balance</div>
          </div>
        </div>
        <div className="w-px h-5 bg-green-dim/8" />
        <TradeBadge traded={data.traded} />
      </div>
    </div>
  );
}

function RawOutput({ output, color }: { output: string; color: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = output.split("\n").map(l => l.trimEnd()).filter(l => l.length > 0);
  if (lines.length === 0) return null;

  const preview = lines.slice(0, 3);
  const hasMore = lines.length > 3;

  return (
    <div className="mt-2 rounded-lg border border-green-dim/10 bg-green-dim/[0.02] overflow-hidden">
      <div className="px-3 py-2">
        <div className="space-y-0.5 font-mono text-[0.55rem] leading-relaxed">
          {(expanded ? lines : preview).map((line, li) => (
            <div key={li} className="flex items-start gap-2">
              <span className="text-green-dim/15 select-none tabular-nums min-w-[14px] text-right">
                {String(li + 1).padStart(2, "0")}
              </span>
              <span className={`whitespace-pre-wrap break-all ${
                line.startsWith("\u2705") || line.startsWith("\u2713") ? "text-green-matrix/80"
                : line.startsWith("\u274c") || line.startsWith("\u26a0") ? "text-red-alert/80"
                : line.startsWith("\ud83d\udc0b") || line.startsWith("\ud83d\udce1") || line.startsWith("\ud83d\udcca") ? `${color}/70`
                : line.startsWith("\ud83d\udca1") || line.startsWith("\u2699") ? "text-amber-warm/60"
                : line.startsWith("\u2500") || line.startsWith("\u2501") ? "text-green-dim/15"
                : line.startsWith("\ud83d\udccb") ? "text-cyan-glow/60"
                : "text-green-dim/40"
              }`}>
                {line}
              </span>
            </div>
          ))}
        </div>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1.5 text-[0.5rem] text-amber-warm/40 hover:text-amber-warm/70 transition-colors"
          >
            {expanded ? "\u25b2 Collapse" : `\u25bc Show ${lines.length - 3} more lines`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Cycle grouping ────────────────────────────────────────

interface ExecutionCycle {
  ts: string;
  entries: Execution[];
}

function groupByCycle(executions: Execution[]): ExecutionCycle[] {
  const cycles: ExecutionCycle[] = [];
  let current: ExecutionCycle | null = null;

  for (const exec of executions) {
    const t = new Date(exec.ts).getTime();
    if (!current || t - new Date(current.ts).getTime() > 60000) {
      current = { ts: exec.ts, entries: [exec] };
      cycles.push(current);
    } else {
      current.entries.push(exec);
    }
  }

  return cycles;
}

// ─── Main component ───────────────────────────────────────

export default function ExecutionsLog({ executions }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (filter === "all") return executions;
    return executions.filter((e) => e.strategy === filter);
  }, [executions, filter]);

  const cycles = useMemo(() => groupByCycle(filtered).reverse(), [filtered]);

  const totalPages = Math.max(1, Math.ceil(cycles.length / PAGE_SIZE));
  // Clamp page if filter changes
  const currentPage = Math.min(page, totalPages - 1);
  const pagedCycles = cycles.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const stratCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    executions.forEach((e) => {
      counts[e.strategy] = (counts[e.strategy] || 0) + 1;
    });
    return counts;
  }, [executions]);

  // Reset page when filter changes
  const handleFilter = (f: string) => {
    setFilter(f);
    setPage(0);
  };

  return (
    <div className="panel p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-dim/40 text-xs">&gt;</span>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-warm">
          Execution Log
        </h2>
        <span className="text-[0.6rem] text-green-dim/40 tabular-nums">
          [{executions.length} runs · {cycles.length} cycles]
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-matrix shadow-[0_0_6px_#00ff41] animate-pulse" />
            <span className="text-[0.55rem] text-green-matrix/60 font-bold tracking-widest">LIVE</span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1.5 mb-4 p-1 rounded-lg bg-terminal-dark/50 border border-panel-border">
        <button
          onClick={() => handleFilter("all")}
          className={`px-3 py-1.5 rounded-md text-[0.55rem] font-bold tracking-wider transition-all ${
            filter === "all"
              ? "bg-amber-warm/15 text-amber-warm shadow-sm"
              : "text-green-dim/30 hover:text-green-dim/60 hover:bg-green-dim/5"
          }`}
        >
          ALL {executions.length}
        </button>
        {Object.entries(STRATEGY_STYLES).map(([key, style]) => (
          <button
            key={key}
            onClick={() => handleFilter(key)}
            className={`px-3 py-1.5 rounded-md text-[0.55rem] font-bold tracking-wider transition-all ${
              filter === key
                ? `${style.bg} ${style.color} shadow-sm`
                : "text-green-dim/30 hover:text-green-dim/60 hover:bg-green-dim/5"
            }`}
          >
            {style.label} {stratCounts[key] ?? 0}
          </button>
        ))}
      </div>

      {/* Cycles list — paginated */}
      <div className="space-y-3">
        {pagedCycles.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-green-dim/25 text-xs">&gt; No executions recorded yet</p>
            <p className="text-green-dim/15 text-[0.6rem] mt-1">
              Waiting for strategy runs from VPS...
            </p>
            <div className="mt-3 flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-amber-warm/30 animate-pulse"
                  style={{ animationDelay: `${i * 0.3}s` }}
                />
              ))}
            </div>
          </div>
        ) : (
          pagedCycles.map((cycle, ci) => {
            const isLatest = currentPage === 0 && ci === 0;
            return (
              <div
                key={`cycle-${cycle.ts}-${ci}`}
                className={`rounded-lg border transition-all ${
                  isLatest
                    ? "border-amber-warm/20 bg-amber-warm/[0.02] shadow-[0_0_12px_rgba(255,170,0,0.03)]"
                    : "border-panel-border bg-terminal-dark/30"
                }`}
              >
                {/* Cycle timestamp bar */}
                <div className={`px-3 py-2 border-b flex items-center gap-2 ${
                  isLatest ? "border-amber-warm/10 bg-amber-warm/[0.03]" : "border-panel-border"
                }`}>
                  {isLatest && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.45rem] font-bold uppercase tracking-wider bg-amber-warm/15 text-amber-warm">
                      LATEST
                    </span>
                  )}
                  <span className="text-[0.6rem] text-green-dim/50 font-mono tabular-nums">
                    {formatTime(cycle.ts)}
                  </span>
                  <span className="text-[0.5rem] text-green-dim/25">
                    {timeAgo(cycle.ts)}
                  </span>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1">
                    {cycle.entries.map((e, i) => {
                      const s = STRATEGY_STYLES[e.strategy];
                      return s ? (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: s.glow, opacity: 0.5 }}
                          title={s.label}
                        />
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Strategy entries */}
                <div className="p-3 space-y-3">
                  {cycle.entries.map((exec, ei) => {
                    const style = STRATEGY_STYLES[exec.strategy] ?? {
                      color: "text-green-dim",
                      bg: "bg-green-dim/10",
                      border: "border-green-dim/20",
                      glow: "#666",
                      label: exec.strategy.toUpperCase(),
                      icon: "?",
                    };

                    const divData = exec.strategy === "ai-divergence" ? parseDivergenceOutput(exec.output) : null;
                    const copyData = exec.strategy === "copytrading" ? parseCopytradingOutput(exec.output) : null;
                    const weatherData = exec.strategy === "weather" ? parseWeatherOutput(exec.output) : null;
                    const hasStructured = divData || copyData || weatherData;

                    return (
                      <div key={`${exec.ts}-${exec.strategy}-${ei}`}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center text-[0.5rem] font-black"
                            style={{
                              backgroundColor: style.glow + "15",
                              color: style.glow,
                              boxShadow: `0 0 6px ${style.glow}20`,
                            }}
                          >
                            {style.icon}
                          </div>
                          <span className={`text-[0.65rem] font-bold ${style.color}`}>
                            {style.label}
                          </span>
                          <StatusBadge status={exec.status} />
                        </div>

                        {divData && <DivergenceTable data={divData} />}
                        {copyData && <CopytradingSummary data={copyData} />}
                        {weatherData && <WeatherSummary data={weatherData} />}

                        {!hasStructured && exec.output.trim().length > 0 && (
                          <RawOutput output={exec.output} color={style.color} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(0)}
            disabled={currentPage === 0}
            className={`px-2 py-1 rounded text-[0.55rem] font-bold tracking-wider transition-all ${
              currentPage === 0
                ? "text-green-dim/15 cursor-not-allowed"
                : "text-green-dim/50 hover:text-green-matrix hover:bg-green-matrix/5"
            }`}
          >
            &laquo;
          </button>
          <button
            onClick={() => setPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className={`px-2 py-1 rounded text-[0.55rem] font-bold tracking-wider transition-all ${
              currentPage === 0
                ? "text-green-dim/15 cursor-not-allowed"
                : "text-green-dim/50 hover:text-green-matrix hover:bg-green-matrix/5"
            }`}
          >
            &lsaquo; PREV
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              // Show pages around current
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i;
              } else if (currentPage < 3) {
                pageNum = i;
              } else if (currentPage > totalPages - 4) {
                pageNum = totalPages - 7 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 rounded text-[0.55rem] font-bold tabular-nums transition-all ${
                    pageNum === currentPage
                      ? "bg-amber-warm/15 text-amber-warm shadow-sm"
                      : "text-green-dim/30 hover:text-green-dim/60 hover:bg-green-dim/5"
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className={`px-2 py-1 rounded text-[0.55rem] font-bold tracking-wider transition-all ${
              currentPage >= totalPages - 1
                ? "text-green-dim/15 cursor-not-allowed"
                : "text-green-dim/50 hover:text-green-matrix hover:bg-green-matrix/5"
            }`}
          >
            NEXT &rsaquo;
          </button>
          <button
            onClick={() => setPage(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
            className={`px-2 py-1 rounded text-[0.55rem] font-bold tracking-wider transition-all ${
              currentPage >= totalPages - 1
                ? "text-green-dim/15 cursor-not-allowed"
                : "text-green-dim/50 hover:text-green-matrix hover:bg-green-matrix/5"
            }`}
          >
            &raquo;
          </button>
        </div>
      )}

      {/* Footer */}
      {cycles.length > 0 && (
        <div className="mt-3 pt-3 border-t border-panel-border flex items-center justify-between">
          <span className="text-[0.5rem] text-green-dim/20">
            VPS 194.163.160.76 · ~2 min refresh · {cycles.length} cycles loaded · page {currentPage + 1}/{totalPages}
          </span>
          <span className="text-[0.5rem] text-green-dim/20 tabular-nums">
            Last run: {formatTime(cycles[0].ts)}
          </span>
        </div>
      )}
    </div>
  );
}
