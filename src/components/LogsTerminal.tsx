"use client";

import { useEffect, useRef } from "react";
import { BOTS, type BotId } from "@/lib/constants";

interface Props {
  botId: BotId;
  log: string;
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
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold" style={{ color: bot.color }}>
          {bot.emoji} {bot.label}
        </span>
        <span className="text-[0.55rem] text-text-muted uppercase tracking-wider">
          Terminal
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse-neon"
            style={{ backgroundColor: bot.color }}
          />
          <span className="text-[0.55rem] text-text-muted">LIVE</span>
        </div>
      </div>

      {/* Terminal body */}
      <div className="bg-bg rounded-lg border border-border p-3 max-h-[300px] overflow-y-auto font-mono">
        {lines.length > 0 ? (
          lines.map((line, i) => (
            <div
              key={i}
              className="text-[0.6rem] text-text-secondary/70 leading-relaxed hover:text-text-secondary transition-colors"
            >
              <span className="text-text-muted/40 select-none tabular-nums mr-2">
                {String(i + 1).padStart(3, " ")}
              </span>
              {line}
            </div>
          ))
        ) : (
          <span className="text-[0.6rem] text-text-muted/40">
            &gt; Awaiting output...
          </span>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
