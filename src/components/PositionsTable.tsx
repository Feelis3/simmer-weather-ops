"use client";

import type { Position } from "@/lib/types";

interface Props {
  positions: Position[];
}

export default function PositionsTable({ positions }: Props) {
  const sorted = [...positions].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-text-primary tracking-wide">
          Positions
        </h3>
        <span className="pill bg-purple/10 text-purple">{positions.length}</span>
      </div>

      {positions.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-text-muted text-xs">No open positions</p>
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((p, i) => {
            const side = p.shares_yes > 0 ? "YES" : p.shares_no > 0 ? "NO" : "---";
            const shares = p.shares_yes > 0 ? p.shares_yes : p.shares_no;
            const isUp = p.pnl >= 0;

            return (
              <div key={`${p.market_id}-${i}`} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-bg-hover transition-colors">
                {/* Side badge */}
                <span className={`pill shrink-0 ${
                  side === "YES" ? "bg-neon/10 text-neon" : "bg-red/10 text-red"
                }`}>
                  {side}
                </span>

                {/* Market + details */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-secondary truncate" title={p.question}>
                    {p.question}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[0.55rem] text-text-muted tabular-nums">
                      {shares.toFixed(1)} shares @ ${p.avg_cost.toFixed(3)}
                    </span>
                    <span className="text-[0.55rem] text-text-muted">&rarr;</span>
                    <span className="text-[0.55rem] text-cyan tabular-nums">
                      ${p.current_price.toFixed(3)}
                    </span>
                    {p.sources.length > 0 && (
                      <span className="pill bg-purple/8 text-purple/60 text-[0.5rem]">
                        {p.sources[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* P&L */}
                <div className="text-right shrink-0">
                  <div className={`text-sm font-bold tabular-nums ${isUp ? "text-neon" : "text-red"}`}>
                    {isUp ? "+" : ""}${p.pnl.toFixed(2)}
                  </div>
                  <div className="text-[0.5rem] text-text-muted tabular-nums">
                    ${p.current_value.toFixed(2)} val
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
