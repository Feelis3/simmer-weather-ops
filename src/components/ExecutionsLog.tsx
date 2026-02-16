"use client";

import { useEffect, useRef } from "react";
import type { Execution } from "@/lib/types";

interface Props {
  executions: Execution[];
}

const STRATEGY_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  weather: { color: "text-green-matrix", bg: "bg-green-matrix/10", label: "WEATHER" },
  copytrading: { color: "text-cyan-glow", bg: "bg-cyan-glow/10", label: "COPYTRADING" },
  "ai-divergence": { color: "text-purple-fade", bg: "bg-purple-fade/10", label: "AI DIVERGENCE" },
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

function formatOutput(output: string): string[] {
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
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

export default function ExecutionsLog({ executions }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [executions.length]);

  // Show latest first
  const sorted = [...executions].reverse();

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-dim/40 text-xs">&gt;</span>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-warm">
          Execution Log — Live Strategy Runs
        </h2>
        <span className="ml-2 text-[0.6rem] text-green-dim/40 tabular-nums">
          [{executions.length} executions]
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-matrix shadow-[0_0_6px_#00ff41] animate-pulse" />
          <span className="text-[0.55rem] text-green-matrix/60 font-bold tracking-widest">LIVE</span>
        </div>
      </div>

      {/* Strategy legend */}
      <div className="flex items-center gap-3 mb-4">
        {Object.entries(STRATEGY_STYLES).map(([key, style]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${style.bg} border border-current ${style.color}`} />
            <span className={`text-[0.55rem] ${style.color} font-bold tracking-wider`}>{style.label}</span>
          </div>
        ))}
      </div>

      {/* Execution entries */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {sorted.length === 0 ? (
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
          sorted.map((exec, i) => {
            const style = STRATEGY_STYLES[exec.strategy] ?? {
              color: "text-green-dim",
              bg: "bg-green-dim/10",
              label: exec.strategy.toUpperCase(),
            };
            const lines = formatOutput(exec.output);
            const isLatest = i === 0;

            return (
              <div
                key={`${exec.ts}-${exec.strategy}-${i}`}
                className={`panel p-3 transition-all ${
                  isLatest ? "border-l-2 border-l-amber-warm/50 shadow-[0_0_8px_rgba(255,170,0,0.05)]" : ""
                }`}
              >
                {/* Header row */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${style.bg} shadow-[0_0_4px_currentColor] ${style.color}`} />
                  <span className={`text-[0.65rem] font-bold ${style.color}`}>
                    {style.label}
                  </span>
                  <StatusBadge status={exec.status} />
                  <span className="ml-auto text-[0.55rem] text-green-dim/40 tabular-nums font-mono">
                    {formatTime(exec.ts)}
                  </span>
                  <span className="text-[0.5rem] text-green-dim/25">
                    ({timeAgo(exec.ts)})
                  </span>
                </div>

                {/* Output lines */}
                {lines.length > 0 && (
                  <div className="ml-4 border-l border-green-dim/10 pl-3">
                    <div className="space-y-0.5 font-mono text-[0.6rem] leading-relaxed">
                      {lines.map((line, li) => (
                        <div key={li} className="flex items-start gap-2">
                          <span className="text-green-dim/15 select-none tabular-nums min-w-[16px] text-right">
                            {String(li + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={`whitespace-pre-wrap break-all ${
                              line.startsWith("✅") || line.startsWith("✓")
                                ? "text-green-matrix/80"
                                : line.startsWith("❌") || line.startsWith("⚠")
                                ? "text-red-alert/80"
                                : line.startsWith("🐋") || line.startsWith("📡") || line.startsWith("📊")
                                ? style.color + "/70"
                                : line.startsWith("💡") || line.startsWith("⚙")
                                ? "text-amber-warm/60"
                                : line.startsWith("─") || line.startsWith("━") || line.startsWith("═")
                                ? "text-green-dim/15"
                                : line.startsWith("📋")
                                ? "text-cyan-glow/60"
                                : "text-green-dim/50"
                            }`}
                          >
                            {line}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer info */}
      {sorted.length > 0 && (
        <div className="mt-3 pt-3 border-t border-panel-border flex items-center justify-between">
          <span className="text-[0.5rem] text-green-dim/20">
            Source: VPS 194.163.160.76 · Updates every ~2 min
          </span>
          <span className="text-[0.5rem] text-green-dim/20 tabular-nums">
            Latest: {formatTime(sorted[0].ts)}
          </span>
        </div>
      )}
    </div>
  );
}
