"use client";

import type { Position } from "@/lib/types";

interface Props {
  positions: Position[];
}

export default function PositionsTable({ positions }: Props) {
  const sorted = [...positions].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-green-dim/40 text-xs">&gt;</span>
        <span className="text-[0.6rem] font-bold tracking-widest uppercase text-green-dim/40">
          Positions
        </span>
        <span className="text-[0.55rem] text-cyan-glow/60 tabular-nums">[{positions.length}]</span>
      </div>

      {positions.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-green-dim/20 text-[0.6rem]">No open positions</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((p, i) => {
            const side = p.shares_yes > 0 ? "YES" : p.shares_no > 0 ? "NO" : "---";
            const shares = p.shares_yes > 0 ? p.shares_yes : p.shares_no;
            const isUp = p.pnl >= 0;

            return (
              <div key={`${p.market_id}-${i}`} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-panel-hover/30 transition-colors border-b border-panel-border/30 last:border-0">
                {/* Side badge */}
                <span className={`shrink-0 w-8 text-center py-0.5 rounded text-[0.5rem] font-bold ${
                  side === "YES" ? "bg-green-matrix/10 text-green-matrix" : "bg-red-alert/10 text-red-alert"
                }`}>
                  {side}
                </span>

                {/* Market + details */}
                <div className="flex-1 min-w-0">
                  <p className="text-[0.6rem] text-green-dim/60 truncate" title={p.question}>
                    {p.question}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[0.45rem] text-green-dim/25 tabular-nums">
                      {shares.toFixed(1)} shares @ ${p.avg_cost.toFixed(3)}
                    </span>
                    <span className="text-[0.45rem] text-green-dim/15">&rarr;</span>
                    <span className="text-[0.45rem] text-cyan-glow/50 tabular-nums">
                      ${p.current_price.toFixed(3)}
                    </span>
                    {p.sources.length > 0 && (
                      <span className="text-[0.4rem] px-1 py-0.5 rounded bg-purple-fade/8 text-purple-fade/50">
                        {p.sources[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* P&L */}
                <div className="text-right shrink-0">
                  <div className={`text-[0.7rem] font-bold tabular-nums ${isUp ? "text-green-matrix" : "text-red-alert"}`}>
                    {isUp ? "+" : ""}${p.pnl.toFixed(2)}
                  </div>
                  <div className="text-[0.4rem] text-green-dim/20 tabular-nums">
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
