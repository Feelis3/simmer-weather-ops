"use client";

import { useState, useMemo } from "react";
import type { Execution } from "@/lib/types";

interface Props {
  executions: Execution[];
}

const STRATEGY_STYLES: Record<string, { color: string; bg: string; glow: string; label: string }> = {
  weather: { color: "text-green-matrix", bg: "bg-green-matrix/10", glow: "#00ff41", label: "WEATHER" },
  copytrading: { color: "text-cyan-glow", bg: "bg-cyan-glow/10", glow: "#00ffff", label: "COPYTRADING" },
  "ai-divergence": { color: "text-purple-fade", bg: "bg-purple-fade/10", glow: "#8b5cf6", label: "AI DIVERGENCE" },
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

interface DivergenceItem {
  question: string;
  current_probability: number;
  external_price_yes: number;
  divergence: number;
  volume_24h: number;
  status: string;
  outcome: boolean | null;
}

/** Try to parse AI divergence JSON output into structured data */
function parseDivergenceOutput(output: string): DivergenceItem[] | null {
  try {
    // The output may contain JSON followed by ---TRADE--- markers
    const jsonMatch = output.match(/^\s*\[[\s\S]*?\]\s*(?:\n---TRADE---|$)/);
    if (!jsonMatch) return null;
    const cleanJson = jsonMatch[0].replace(/\n---TRADE---/, "").trim();
    const parsed = JSON.parse(cleanJson);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (!parsed[0].question) return null;
    return parsed as DivergenceItem[];
  } catch {
    return null;
  }
}

/** Parse copytrading output into structured summary */
function parseCopytradingOutput(output: string): {
  walletsAnalyzed: number;
  positionsFound: number;
  conflictsSkipped: number;
  matched: boolean;
  summary: string;
} | null {
  const walletsMatch = output.match(/Wallets analyzed:\s*(\d+)/);
  const posMatch = output.match(/Positions found:\s*(\d+)/);
  const conflictsMatch = output.match(/Conflicts skipped:\s*(\d+)/);
  const noMatch = output.includes("No target positions could be matched");
  const scanComplete = output.includes("Scan complete");

  if (!walletsMatch && !posMatch) return null;

  return {
    walletsAnalyzed: walletsMatch ? parseInt(walletsMatch[1]) : 0,
    positionsFound: posMatch ? parseInt(posMatch[1]) : 0,
    conflictsSkipped: conflictsMatch ? parseInt(conflictsMatch[1]) : 0,
    matched: !noMatch,
    summary: scanComplete ? (noMatch ? "No matches found" : "Matches found") : "In progress",
  };
}

/** Parse weather output */
function parseWeatherOutput(output: string): string | null {
  const sizingMatch = output.match(/Smart sizing:\s*\$([0-9.]+)\s*\(([^)]+)\)/);
  if (sizingMatch) {
    return `$${sizingMatch[1]} — ${sizingMatch[2]}`;
  }
  const trimmed = output.trim();
  if (trimmed.length === 0) return "No output";
  return null;
}

function StatusBadge({ status }: { status: string }) {
  const isOk = status === "ok" || status === "success";
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[0.55rem] font-bold uppercase tracking-wider ${
        isOk
          ? "bg-green-matrix/15 text-green-matrix border border-green-matrix/20"
          : "bg-red-alert/15 text-red-alert border border-red-alert/20"
      }`}
    >
      {isOk ? "OK" : status.toUpperCase()}
    </span>
  );
}

/** Render AI Divergence as a nice table */
function DivergenceTable({ items }: { items: DivergenceItem[] }) {
  // Sort by absolute divergence
  const sorted = [...items].sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence));
  const top = sorted.slice(0, 8); // Show top 8

  return (
    <div className="ml-4 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[0.55rem] text-purple-fade/60 uppercase tracking-wider">
          {items.length} opportunities scanned — top {top.length}:
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-[0.5rem] text-green-dim/30 font-normal pb-1">Market</th>
              <th className="text-right text-[0.5rem] text-green-dim/30 font-normal pb-1">Simmer</th>
              <th className="text-right text-[0.5rem] text-green-dim/30 font-normal pb-1">PM</th>
              <th className="text-right text-[0.5rem] text-green-dim/30 font-normal pb-1">Div%</th>
              <th className="text-right text-[0.5rem] text-green-dim/30 font-normal pb-1">Vol 24h</th>
              <th className="text-center text-[0.5rem] text-green-dim/30 font-normal pb-1">Result</th>
            </tr>
          </thead>
          <tbody>
            {top.map((item, i) => {
              const divAbs = Math.abs(item.divergence * 100);
              const divPct = item.divergence * 100;
              return (
                <tr key={i} className={divAbs > 10 ? "bg-purple-fade/5" : ""}>
                  <td className="text-[0.55rem] text-green-dim/70 max-w-[200px] truncate pr-2 py-0.5" title={item.question}>
                    {item.question.replace(/^(Bitcoin|Ethereum|Solana)\s+(Up or Down)\s*-\s*/, "$1 ")}
                  </td>
                  <td className="text-[0.55rem] text-purple-fade tabular-nums text-right py-0.5">
                    {(item.current_probability * 100).toFixed(1)}%
                  </td>
                  <td className="text-[0.55rem] text-cyan-glow tabular-nums text-right py-0.5">
                    {(item.external_price_yes * 100).toFixed(1)}%
                  </td>
                  <td className={`text-[0.55rem] tabular-nums text-right font-bold py-0.5 ${
                    divAbs > 10 ? "text-amber-warm" : divAbs > 5 ? "text-green-matrix" : "text-green-dim/50"
                  }`}>
                    {divPct > 0 ? "+" : ""}{divPct.toFixed(1)}%
                  </td>
                  <td className="text-[0.55rem] text-green-dim/40 tabular-nums text-right py-0.5">
                    ${item.volume_24h?.toFixed(0) ?? "—"}
                  </td>
                  <td className="text-center py-0.5">
                    {item.outcome === true ? (
                      <span className="text-[0.5rem] text-green-matrix">✓ YES</span>
                    ) : item.outcome === false ? (
                      <span className="text-[0.5rem] text-red-alert">✗ NO</span>
                    ) : (
                      <span className="text-[0.5rem] text-amber-warm/50">PENDING</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {items.length > top.length && (
        <p className="text-[0.5rem] text-green-dim/20 mt-1">
          +{items.length - top.length} more opportunities below threshold
        </p>
      )}
    </div>
  );
}

/** Render copytrading as a compact summary */
function CopytradingSummary({ data }: { data: { walletsAnalyzed: number; positionsFound: number; conflictsSkipped: number; matched: boolean; summary: string } }) {
  return (
    <div className="ml-4 mt-2 flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-1.5">
        <span className="text-[0.55rem] text-green-dim/40">Wallets:</span>
        <span className="text-[0.6rem] text-cyan-glow font-bold tabular-nums">{data.walletsAnalyzed}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[0.55rem] text-green-dim/40">Positions:</span>
        <span className="text-[0.6rem] text-cyan-glow font-bold tabular-nums">{data.positionsFound}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[0.55rem] text-green-dim/40">Conflicts:</span>
        <span className="text-[0.6rem] text-amber-warm/70 tabular-nums">{data.conflictsSkipped}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {data.matched ? (
          <span className="text-[0.55rem] text-green-matrix font-bold">✓ MATCHED</span>
        ) : (
          <span className="text-[0.55rem] text-green-dim/40">No matches</span>
        )}
      </div>
    </div>
  );
}

/** Render weather as compact */
function WeatherSummary({ text }: { text: string }) {
  return (
    <div className="ml-4 mt-1 flex items-center gap-2">
      <span className="text-[0.55rem] text-green-matrix/60">💡</span>
      <span className="text-[0.6rem] text-green-dim/60">{text}</span>
    </div>
  );
}

/** Raw output fallback (collapsible) */
function RawOutput({ output, color }: { output: string; color: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = output.split("\n").map(l => l.trimEnd()).filter(l => l.length > 0);
  if (lines.length === 0) return null;

  const preview = lines.slice(0, 3);
  const hasMore = lines.length > 3;

  return (
    <div className="ml-4 mt-1 border-l border-green-dim/10 pl-3">
      <div className="space-y-0.5 font-mono text-[0.55rem] leading-relaxed">
        {(expanded ? lines : preview).map((line, li) => (
          <div key={li} className="flex items-start gap-2">
            <span className="text-green-dim/15 select-none tabular-nums min-w-[14px] text-right">
              {String(li + 1).padStart(2, "0")}
            </span>
            <span className={`whitespace-pre-wrap break-all ${
              line.startsWith("✅") || line.startsWith("✓") ? "text-green-matrix/80"
              : line.startsWith("❌") || line.startsWith("⚠") ? "text-red-alert/80"
              : line.startsWith("🐋") || line.startsWith("📡") || line.startsWith("📊") ? `${color}/70`
              : line.startsWith("💡") || line.startsWith("⚙") ? "text-amber-warm/60"
              : line.startsWith("─") || line.startsWith("━") ? "text-green-dim/15"
              : line.startsWith("📋") ? "text-cyan-glow/60"
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
          className="mt-1 text-[0.5rem] text-amber-warm/40 hover:text-amber-warm/70 transition-colors"
        >
          {expanded ? "▲ Collapse" : `▼ Show ${lines.length - 3} more lines`}
        </button>
      )}
    </div>
  );
}

/** Group executions by cycle (same ~30s window) */
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

export default function ExecutionsLog({ executions }: Props) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return executions;
    return executions.filter((e) => e.strategy === filter);
  }, [executions, filter]);

  const cycles = useMemo(() => groupByCycle(filtered).reverse(), [filtered]);

  // Stats
  const stratCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    executions.forEach((e) => {
      counts[e.strategy] = (counts[e.strategy] || 0) + 1;
    });
    return counts;
  }, [executions]);

  return (
    <div className="panel p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-dim/40 text-xs">&gt;</span>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-warm">
          Execution Log — Live Strategy Runs
        </h2>
        <span className="ml-2 text-[0.6rem] text-green-dim/40 tabular-nums">
          [{executions.length} total]
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-matrix shadow-[0_0_6px_#00ff41] animate-pulse" />
          <span className="text-[0.55rem] text-green-matrix/60 font-bold tracking-widest">LIVE</span>
        </div>
      </div>

      {/* Filter buttons + stats */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-2.5 py-1 rounded text-[0.55rem] font-bold tracking-wider transition-all ${
            filter === "all"
              ? "bg-amber-warm/15 text-amber-warm border border-amber-warm/30"
              : "text-green-dim/30 hover:text-green-dim/60 border border-transparent"
          }`}
        >
          ALL ({executions.length})
        </button>
        {Object.entries(STRATEGY_STYLES).map(([key, style]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-2.5 py-1 rounded text-[0.55rem] font-bold tracking-wider transition-all ${
              filter === key
                ? `${style.bg} ${style.color} border border-current/30`
                : "text-green-dim/30 hover:text-green-dim/60 border border-transparent"
            }`}
          >
            {style.label} ({stratCounts[key] ?? 0})
          </button>
        ))}
      </div>

      {/* Execution cycles */}
      <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
        {cycles.length === 0 ? (
          <div className="py-8 text-center">
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
          cycles.map((cycle, ci) => {
            const isLatest = ci === 0;
            return (
              <div
                key={`cycle-${cycle.ts}-${ci}`}
                className={`panel p-3 ${
                  isLatest ? "border-l-2 border-l-amber-warm/50 shadow-[0_0_8px_rgba(255,170,0,0.05)]" : ""
                }`}
              >
                {/* Cycle header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[0.55rem] text-green-dim/30 font-mono tabular-nums">
                    {formatTime(cycle.ts)}
                  </span>
                  <span className="text-[0.5rem] text-green-dim/20">
                    ({timeAgo(cycle.ts)})
                  </span>
                  <div className="flex-1 h-px bg-green-dim/8 mx-2" />
                  <span className="text-[0.5rem] text-green-dim/20">
                    {cycle.entries.length} {cycle.entries.length === 1 ? "strategy" : "strategies"}
                  </span>
                  {isLatest && (
                    <span className="text-[0.5rem] text-amber-warm/60 font-bold">LATEST</span>
                  )}
                </div>

                {/* Strategy entries in this cycle */}
                <div className="space-y-2">
                  {cycle.entries.map((exec, ei) => {
                    const style = STRATEGY_STYLES[exec.strategy] ?? {
                      color: "text-green-dim",
                      bg: "bg-green-dim/10",
                      glow: "#666",
                      label: exec.strategy.toUpperCase(),
                    };

                    // Try structured parsing
                    const divData = exec.strategy === "ai-divergence" ? parseDivergenceOutput(exec.output) : null;
                    const copyData = exec.strategy === "copytrading" ? parseCopytradingOutput(exec.output) : null;
                    const weatherText = exec.strategy === "weather" ? parseWeatherOutput(exec.output) : null;
                    const hasStructured = divData || copyData || weatherText;

                    return (
                      <div key={`${exec.ts}-${exec.strategy}-${ei}`}>
                        {/* Strategy row */}
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: style.glow, boxShadow: `0 0 4px ${style.glow}` }}
                          />
                          <span className={`text-[0.6rem] font-bold ${style.color}`}>
                            {style.label}
                          </span>
                          <StatusBadge status={exec.status} />
                          {exec.strategy !== cycle.entries[0].strategy && (
                            <span className="text-[0.5rem] text-green-dim/20 tabular-nums font-mono">
                              {formatTime(exec.ts)}
                            </span>
                          )}
                        </div>

                        {/* Structured output */}
                        {divData && <DivergenceTable items={divData} />}
                        {copyData && <CopytradingSummary data={copyData} />}
                        {weatherText && <WeatherSummary text={weatherText} />}

                        {/* Raw fallback if no structured parse */}
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

      {/* Footer */}
      {cycles.length > 0 && (
        <div className="mt-3 pt-3 border-t border-panel-border flex items-center justify-between">
          <span className="text-[0.5rem] text-green-dim/20">
            Source: VPS 194.163.160.76 · Updates every ~2 min · {cycles.length} cycles
          </span>
          <span className="text-[0.5rem] text-green-dim/20 tabular-nums">
            Latest: {formatTime(cycles[0].ts)}
          </span>
        </div>
      )}
    </div>
  );
}
