"use client";

import { useEffect, useRef } from "react";

export interface LogEntry {
  time: string;
  message: string;
  level: "info" | "success" | "warn" | "error" | "fetch";
}

interface Props {
  entries: LogEntry[];
}

const levelColors: Record<LogEntry["level"], string> = {
  info: "text-green-dim/50",
  success: "text-green-matrix",
  warn: "text-amber-warm",
  error: "text-red-alert",
  fetch: "text-cyan-glow",
};

const levelPrefix: Record<LogEntry["level"], string> = {
  info: "INF",
  success: " OK",
  warn: "WRN",
  error: "ERR",
  fetch: "NET",
};

export default function SystemLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-green-dim/40 text-xs">&gt;</span>
        <h2 className="text-xs font-bold tracking-widest uppercase text-green-matrix">
          System Log
        </h2>
        <span className="ml-2 text-[0.6rem] text-green-dim/30 tabular-nums">
          [{entries.length} entries]
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-green-matrix shadow-[0_0_3px_#00ff41] animate-pulse" />
          <span className="text-[0.55rem] text-green-dim/30">LIVE</span>
        </div>
      </div>

      <div className="font-mono text-[0.65rem] space-y-0.5 max-h-[200px] overflow-y-auto">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-green-dim/20 tabular-nums select-none shrink-0">
              {entry.time}
            </span>
            <span className={`shrink-0 font-bold ${levelColors[entry.level]}`}>
              [{levelPrefix[entry.level]}]
            </span>
            <span className={levelColors[entry.level]}>
              {entry.message}
            </span>
          </div>
        ))}
        {entries.length === 0 && (
          <span className="text-green-dim/20">&gt; Waiting for system events...</span>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
