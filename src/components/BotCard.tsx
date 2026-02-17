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
    .slice(-5);

  return (
    <div
      className="panel p-4 flex flex-col gap-3"
      style={{ borderColor: bot.color + "30" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-base shrink-0"
          style={{ backgroundColor: bot.color + "15", color: bot.color }}
        >
          {bot.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[0.7rem] font-bold tracking-wide uppercase"
              style={{ color: bot.color }}
            >
              {bot.label}
            </span>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  active
                    ? "bg-green-matrix shadow-[0_0_4px_#39ff7f]"
                    : "bg-red-alert shadow-[0_0_4px_#f43f5e]"
                }`}
              />
              <span
                className={`text-[0.5rem] uppercase tracking-wider font-medium ${
                  active ? "text-green-matrix/60" : "text-red-alert/60"
                }`}
              >
                {active ? "ACTIVE" : "IDLE"}
              </span>
            </div>
          </div>
          <p className="text-[0.5rem] text-green-dim/30 mt-0.5 truncate">
            {bot.desc}
          </p>
        </div>
      </div>

      {/* Mini terminal log */}
      <div className="bg-terminal-dark/80 rounded border border-panel-border/50 p-2 max-h-[80px] overflow-y-auto font-mono">
        {logLines.length > 0 ? (
          logLines.map((line, i) => (
            <div
              key={i}
              className="text-[0.5rem] text-green-dim/40 leading-relaxed truncate"
            >
              <span className="text-green-dim/15 select-none">&gt; </span>
              {line}
            </div>
          ))
        ) : (
          <span className="text-[0.5rem] text-green-dim/15">
            &gt; No recent output
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mt-auto">
        <button
          onClick={() => onToggle(!active)}
          className={`flex-1 px-3 py-1.5 rounded text-[0.55rem] font-bold uppercase tracking-wider transition-all ${
            active
              ? "bg-green-matrix/10 text-green-matrix border border-green-matrix/20 hover:bg-green-matrix/20"
              : "bg-red-alert/10 text-red-alert border border-red-alert/20 hover:bg-red-alert/20"
          }`}
        >
          {active ? "ON" : "OFF"}
        </button>
        <button
          onClick={onRun}
          className="flex-1 px-3 py-1.5 rounded text-[0.55rem] font-bold uppercase tracking-wider bg-cyan-glow/10 text-cyan-glow border border-cyan-glow/20 hover:bg-cyan-glow/20 transition-all"
        >
          Run Now
        </button>
      </div>
    </div>
  );
}
