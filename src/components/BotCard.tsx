"use client";

import { BOTS, type BotId } from "@/lib/constants";

interface Props {
  botId: BotId;
  active: boolean;
  log: string;
  onToggle: (enabled: boolean) => void;
  onRun: () => void;
}

function getLogLineColor(line: string): string {
  const u = line.toUpperCase();
  if (u.includes("ERROR") || u.includes("FAILED") || u.includes("EXCEPTION")) return "text-red/70";
  if (u.includes("WARN")) return "text-amber/70";
  if (u.includes("BUY") || u.includes("SELL") || u.includes("✓") || u.includes("SUCCESS")) return "text-neon/70";
  return "text-text-muted/70";
}

function parseLastRun(log: string): string | null {
  const lines = log.split("\n").filter((l) => l.trim()).reverse();
  for (const line of lines.slice(0, 8)) {
    const match = line.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2})/);
    if (match) {
      const dt = new Date(match[1]);
      if (!isNaN(dt.getTime())) {
        const mins = Math.floor((Date.now() - dt.getTime()) / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
      }
    }
  }
  return null;
}

export default function BotCard({ botId, active, log, onToggle, onRun }: Props) {
  const bot = BOTS[botId];
  const logLines = log.split("\n").filter((l) => l.trim()).slice(-4);
  const lastRun = parseLastRun(log);

  return (
    <div className="card p-4 flex flex-col gap-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
          style={{ backgroundColor: bot.color + "15" }}
        >
          {bot.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wide" style={{ color: bot.color }}>
              {bot.label}
            </span>
            {/* Animated status indicator */}
            <div className="flex items-center gap-1">
              <div
                className={`w-1.5 h-1.5 rounded-full ${active ? "animate-pulse-neon" : ""}`}
                style={{
                  backgroundColor: active ? "#03E78B" : "#ff4466",
                  opacity: active ? 1 : 0.7,
                }}
              />
              <span className={`text-[0.5rem] font-bold tracking-wider ${active ? "text-neon" : "text-red"}`}>
                {active ? "LIVE" : "OFF"}
              </span>
            </div>
          </div>
          <p className="text-[0.5rem] text-text-muted mt-0.5 truncate">{bot.desc}</p>
          {lastRun && (
            <p className="text-[0.45rem] text-text-muted/50 mt-0.5">last run: {lastRun}</p>
          )}
        </div>
      </div>

      {/* Mini log */}
      <div className="bg-bg rounded-lg border border-border p-2 max-h-[76px] overflow-y-auto font-mono flex-1">
        {logLines.length > 0 ? (
          logLines.map((line, i) => (
            <div key={i} className={`text-[0.5rem] leading-relaxed truncate ${getLogLineColor(line)}`}>
              <span className="text-text-muted/25 select-none">&gt; </span>
              {line}
            </div>
          ))
        ) : (
          <span className="text-[0.5rem] text-text-muted/40">&gt; No recent output</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mt-auto">
        <button
          onClick={() => onToggle(!active)}
          className={`flex-1 px-3 py-1.5 rounded-lg text-[0.6rem] font-semibold tracking-wide transition-all border ${
            active
              ? "bg-neon/8 text-neon hover:bg-neon/15 border-neon/20"
              : "bg-red/8 text-red hover:bg-red/15 border-red/20"
          }`}
        >
          {active ? "Disable" : "Enable"}
        </button>
        <button
          onClick={onRun}
          className="flex-1 px-3 py-1.5 rounded-lg text-[0.6rem] font-semibold tracking-wide bg-cyan/8 text-cyan hover:bg-cyan/15 border border-cyan/20 transition-all"
        >
          ▶ Run
        </button>
      </div>
    </div>
  );
}
