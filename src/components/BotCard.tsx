"use client";

import { BOTS, type BotId } from "@/lib/constants";

interface Props {
  botId: BotId;
  active: boolean;
  log: string;
  onToggle: (enabled: boolean) => void;
  onRun: () => void;
}

export default function BotCard({ botId, active, log, onToggle, onRun }: Props) {
  const bot = BOTS[botId];
  const logLines = log
    .split("\n")
    .filter((l) => l.trim())
    .slice(-4);

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
            <span
              className="text-xs font-semibold tracking-wide"
              style={{ color: bot.color }}
            >
              {bot.label}
            </span>
            <span
              className={`pill text-[0.55rem] ${
                active
                  ? "bg-neon/10 text-neon"
                  : "bg-red/10 text-red"
              }`}
            >
              {active ? "Active" : "Idle"}
            </span>
          </div>
          <p className="text-[0.55rem] text-text-muted mt-0.5 truncate">
            {bot.desc}
          </p>
        </div>
      </div>

      {/* Mini log */}
      <div className="bg-bg rounded-lg border border-border p-2 max-h-[72px] overflow-y-auto font-mono">
        {logLines.length > 0 ? (
          logLines.map((line, i) => (
            <div
              key={i}
              className="text-[0.5rem] text-text-muted/70 leading-relaxed truncate"
            >
              <span className="text-text-muted/30 select-none">&gt; </span>
              {line}
            </div>
          ))
        ) : (
          <span className="text-[0.5rem] text-text-muted/40">
            &gt; No recent output
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mt-auto">
        <button
          onClick={() => onToggle(!active)}
          className={`flex-1 px-3 py-1.5 rounded-lg text-[0.6rem] font-semibold tracking-wide transition-all ${
            active
              ? "bg-neon/10 text-neon hover:bg-neon/20"
              : "bg-red/10 text-red hover:bg-red/20"
          }`}
        >
          {active ? "ON" : "OFF"}
        </button>
        <button
          onClick={onRun}
          className="flex-1 px-3 py-1.5 rounded-lg text-[0.6rem] font-semibold tracking-wide bg-cyan/10 text-cyan hover:bg-cyan/20 transition-all"
        >
          Run Now
        </button>
      </div>
    </div>
  );
}
