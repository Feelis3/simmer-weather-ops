"use client";

import type { MarketItem } from "@/lib/types";

interface Props {
  markets: MarketItem[];
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

export default function MarketsTable({ markets }: Props) {
  const sorted = [...markets]
    .sort((a, b) => b.volume_24h - a.volume_24h)
    .slice(0, 15);

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-text-primary tracking-wide">
          Markets Scanner
        </h3>
        <span className="pill bg-cyan/10 text-cyan">{markets.length}</span>
      </div>

      {sorted.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-text-muted text-xs">Scanning for opportunities...</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {sorted.map((m) => {
            const absDivergence = Math.abs(m.divergence * 100);
            const divColor =
              absDivergence > 15
                ? "text-red"
                : absDivergence > 10
                ? "text-amber"
                : "text-text-secondary";

            return (
              <div key={m.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-bg-hover transition-colors">
                {/* Question */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-secondary truncate" title={m.question}>
                    {truncate(m.question, 55)}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[0.55rem] text-cyan tabular-nums">
                      {(m.current_probability * 100).toFixed(1)}%
                    </span>
                    <span className={`text-[0.55rem] font-semibold tabular-nums ${divColor}`}>
                      {(m.divergence * 100).toFixed(1)}% div
                    </span>
                    <span className="text-[0.55rem] text-text-muted tabular-nums">
                      {formatVolume(m.volume_24h)}
                    </span>
                  </div>
                </div>

                {/* Score */}
                <span
                  className={`pill text-[0.55rem] font-semibold tabular-nums ${
                    m.opportunity_score >= 0.7
                      ? "bg-neon/10 text-neon"
                      : m.opportunity_score >= 0.4
                      ? "bg-amber/10 text-amber"
                      : "bg-bg-hover text-text-muted"
                  }`}
                >
                  {m.opportunity_score.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
