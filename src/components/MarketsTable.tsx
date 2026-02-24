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

export default function MarketsTable({ markets }: Props) {
  // Sort by opportunity score descending
  const sorted = [...markets].sort((a, b) => b.opportunity_score - a.opportunity_score).slice(0, 15);

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-text-primary tracking-wide">Markets Scanner</h3>
        <div className="flex items-center gap-2">
          <span className="text-[0.5rem] text-text-muted">by score</span>
          <span className="pill bg-cyan/10 text-cyan">{markets.length}</span>
        </div>
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
              absDivergence > 15 ? "text-red" : absDivergence > 10 ? "text-amber" : "text-text-secondary";
            const scoreColor =
              m.opportunity_score >= 0.7
                ? "bg-neon/10 text-neon"
                : m.opportunity_score >= 0.4
                ? "bg-amber/10 text-amber"
                : "bg-bg-hover text-text-muted";
            const prob = Math.max(0, Math.min(1, m.current_probability));

            return (
              <div key={m.id} className="py-2 px-3 rounded-xl hover:bg-bg-hover transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-text-secondary truncate" title={m.question}>
                        {m.question}
                      </p>
                      {m.url && (
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-muted/35 hover:text-cyan transition-colors shrink-0"
                          title="Open market"
                        >
                          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                            <path
                              d="M5.5 1.5H8.5V4.5M8.5 1.5L4 6M3 2H1.5V8.5H8V7"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[0.55rem] text-cyan tabular-nums font-semibold">
                        {(prob * 100).toFixed(1)}%
                      </span>
                      <span className={`text-[0.55rem] font-semibold tabular-nums ${divColor}`}>
                        {(m.divergence * 100).toFixed(1)}% div
                      </span>
                      <span className="text-[0.55rem] text-text-muted tabular-nums">
                        {formatVolume(m.volume_24h)}
                      </span>
                    </div>

                    {/* Probability bar */}
                    <div className="mt-1.5 h-0.5 w-full bg-bg-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${prob * 100}%`, backgroundColor: "#22d3ee", opacity: 0.35 }}
                      />
                    </div>
                  </div>

                  {/* Score */}
                  <span className={`pill text-[0.55rem] font-bold tabular-nums ${scoreColor}`}>
                    {m.opportunity_score.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
