"use client";

import type { BtcData } from "@/lib/types";

interface Props {
  data: BtcData | null;
}

export default function BtcWidget({ data }: Props) {
  if (!data) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-amber-warm/40 text-xs">&#x20BF;</span>
        <span className="text-[0.6rem] text-green-dim/20 tabular-nums">---</span>
      </div>
    );
  }

  const isUp = data.change_24h >= 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-amber-warm text-xs">&#x20BF;</span>
      <span className="text-[0.7rem] font-bold text-amber-warm tabular-nums">
        ${data.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
      </span>
      <span className={`text-[0.55rem] font-bold tabular-nums ${isUp ? "text-green-matrix" : "text-red-alert"}`}>
        {isUp ? "\u25B2" : "\u25BC"}{data.change_24h.toFixed(1)}%
      </span>
    </div>
  );
}
