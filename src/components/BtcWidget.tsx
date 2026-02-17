"use client";

import type { BtcData } from "@/lib/types";

interface Props {
  data: BtcData | null;
}

function formatPrice(price: number): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `$${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  return `$${vol.toLocaleString()}`;
}

export default function BtcWidget({ data }: Props) {
  if (!data) {
    return (
      <div className="panel p-4 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-warm/30 animate-pulse" />
          <span className="text-[0.6rem] text-green-dim/30 font-mono">
            Loading BTC data...
          </span>
        </div>
      </div>
    );
  }

  const isPositive = data.change_24h >= 0;

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-warm text-base">&#x20BF;</span>
        <span className="text-[0.6rem] text-green-dim/30 uppercase tracking-wider font-medium">
          Bitcoin
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-lg font-bold text-amber-warm tabular-nums leading-none">
          ${formatPrice(data.price)}
        </span>
        <div className="flex items-center gap-1">
          <span
            className={`text-[0.65rem] font-bold tabular-nums ${
              isPositive ? "text-green-matrix" : "text-red-alert"
            }`}
          >
            {isPositive ? "\u25B2" : "\u25BC"}{" "}
            {isPositive ? "+" : ""}
            {data.change_24h.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[0.5rem] text-green-dim/20 uppercase">Vol 24h</span>
        <span className="text-[0.55rem] text-green-dim/40 tabular-nums">
          {formatVolume(data.volume_24h)}
        </span>
      </div>
    </div>
  );
}
