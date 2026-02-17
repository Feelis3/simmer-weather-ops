"use client";

import type { LeaderboardData } from "@/lib/types";

interface Props {
  data: LeaderboardData | null;
}

export default function LeaderboardCard({ data }: Props) {
  if (!data) {
    return (
      <div className="panel p-4 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-fade/30 animate-pulse" />
          <span className="text-[0.6rem] text-green-dim/30 font-mono">
            Loading leaderboard...
          </span>
        </div>
      </div>
    );
  }

  const pnlPositive = data.total_pnl >= 0;

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[0.6rem] text-green-dim/30 uppercase tracking-wider font-medium">
          Leaderboard
        </span>
      </div>

      {/* Rank - prominent */}
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-[0.5rem] text-green-dim/20 uppercase">Rank</span>
        <span className="text-lg font-bold text-purple-fade tabular-nums leading-none">
          #{data.rank}
        </span>
        <span className="text-[0.55rem] text-green-dim/25 tabular-nums">
          / {data.total_agents}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.5rem] text-green-dim/20 uppercase tracking-wider">
            P&L
          </span>
          <span
            className={`text-[0.7rem] font-bold tabular-nums ${
              pnlPositive ? "text-green-matrix" : "text-red-alert"
            }`}
          >
            {pnlPositive ? "+" : ""}${data.total_pnl.toFixed(2)}
          </span>
          <span
            className={`text-[0.5rem] tabular-nums ${
              pnlPositive ? "text-green-matrix/40" : "text-red-alert/40"
            }`}
          >
            {pnlPositive ? "+" : ""}
            {data.pnl_percent.toFixed(1)}%
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[0.5rem] text-green-dim/20 uppercase tracking-wider">
            Win Rate
          </span>
          <span className="text-[0.7rem] font-bold tabular-nums text-cyan-glow">
            {(data.win_rate * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
