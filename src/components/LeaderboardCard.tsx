"use client";

import type { LeaderboardData } from "@/lib/types";

interface Props {
  data: LeaderboardData | null;
}

export default function LeaderboardCard({ data }: Props) {
  if (!data) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[0.55rem] text-green-dim/20">Rank ---</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.5rem] text-green-dim/30 uppercase">Rank</span>
      <span className="text-[0.7rem] font-bold text-purple-fade tabular-nums">
        #{data.rank}
      </span>
      <span className="text-[0.5rem] text-green-dim/20 tabular-nums">
        /{data.total_agents}
      </span>
    </div>
  );
}
