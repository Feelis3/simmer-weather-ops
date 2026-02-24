"use client";

import { useEffect, useRef } from "react";
import { BOTS, type BotId } from "@/lib/constants";

interface Props {
  botId: BotId;
  log: string;
}

function getLineColor(line: string): string {
  const u = line.toUpperCase();
  if (u.includes("ERROR") || u.includes("EXCEPTION") || u.includes("TRACEBACK") || u.includes("FAILED")) return "text-red/80";
  if (u.includes("WARN") || u.includes("WARNING")) return "text-amber/80";
  if (u.includes("BUY") || u.includes("SELL") || u.includes("TRADE") || u.includes("✓") || u.includes("SUCCESS")) return "text-neon/80";
  if (u.includes("DEBUG")) return "text-text-muted/50";
  if (u.includes("INFO")) return "text-text-secondary/65";
  return "text-text-secondary/60";
}

export default function LogsTerminal({ botId, log }: Props) {
  const bot = BOTS[botId];
  const bottomRef = useRef<HTMLDivElement>(null);
  const lines = log.split("\n").filter((l) => l.trim());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold" style={{ color: bot.color }}>
          {bot.emoji} {bot.label}
        </span>
        <span className="text-[0.55rem] text-text-muted uppercase tracking-wider">Terminal</span>
        <span className="text-[0.5rem] text-text-muted/60 tabular-nums">({lines.length})</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse-neon"
            style={{ backgroundColor: bot.color }}
          />
          <span className="text-[0.55rem] text-text-muted">LIVE</span>
        </div>
      </div>

      <div className="bg-bg rounded-lg border border-border p-3 max-h-[300px] overflow-y-auto font-mono">
        {lines.length > 0 ? (
          lines.map((line, i) => (
            <div
              key={i}
              className={`text-[0.6rem] leading-relaxed hover:brightness-125 transition-all ${getLineColor(line)}`}
            >
              <span className="text-text-muted/25 select-none tabular-nums mr-2">
                {String(i + 1).padStart(3, " ")}
              </span>
              {line}
            </div>
          ))
        ) : (
          <span className="text-[0.6rem] text-text-muted/40">&gt; Awaiting output...</span>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
