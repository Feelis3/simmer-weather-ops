"use client";

import type { BtcData } from "@/lib/types";

interface Props {
  data: BtcData | null;
}

export default function BtcWidget({ data }: Props) {
  if (!data) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-amber/40 text-xs">&#x20BF;</span>
        <span className="text-[0.6rem] text-text-muted tabular-nums">---</span>
      </div>
    );
  }

  const isUp = data.change_24h >= 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-amber text-xs">&#x20BF;</span>
      <span className="text-[0.7rem] font-bold text-amber tabular-nums">
        ${data.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
      </span>
      <span className={`text-[0.55rem] font-semibold tabular-nums ${isUp ? "text-neon" : "text-red"}`}>
        {isUp ? "\u25B2" : "\u25BC"}{data.change_24h.toFixed(1)}%
      </span>
    </div>
  );
}
