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

const levelStyles: Record<LogEntry["level"], { color: string; prefix: string; dot: string }> = {
  info: { color: "text-green-dim/40", prefix: "INF", dot: "bg-green-dim/30" },
  success: { color: "text-green-matrix/70", prefix: " OK", dot: "bg-green-matrix" },
  warn: { color: "text-amber-warm/70", prefix: "WRN", dot: "bg-amber-warm" },
  error: { color: "text-red-alert/70", prefix: "ERR", dot: "bg-red-alert" },
  fetch: { color: "text-cyan-glow/50", prefix: "NET", dot: "bg-cyan-glow" },
};

export default function SystemLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[0.65rem] font-medium tracking-widest uppercase text-green-dim/30">
          System Log
        </h2>
        <span className="text-[0.55rem] text-green-dim/15 tabular-nums">
          {entries.length}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-green-matrix shadow-[0_0_3px_#39ff7f] animate-pulse" />
          <span className="text-[0.5rem] text-green-dim/20">LIVE</span>
        </div>
      </div>

      <div className="font-mono text-[0.6rem] space-y-px max-h-[180px] overflow-y-auto">
        {entries.map((entry, i) => {
          const s = levelStyles[entry.level];
          return (
            <div key={i} className="flex items-start gap-2 py-px hover:bg-surface/30 rounded px-1 -mx-1 transition-colors">
              <span className="text-green-dim/12 tabular-nums select-none shrink-0 min-w-[72px]">
                {entry.time}
              </span>
              <span className="shrink-0 flex items-center gap-1">
                <span className={`w-1 h-1 rounded-full ${s.dot} shrink-0`} />
                <span className={`font-medium ${s.color} min-w-[24px]`}>
                  {s.prefix}
                </span>
              </span>
              <span className={`${s.color} leading-relaxed`}>
                {entry.message}
              </span>
            </div>
          );
        })}
        {entries.length === 0 && (
          <span className="text-green-dim/15">&gt; Waiting for system events...</span>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
