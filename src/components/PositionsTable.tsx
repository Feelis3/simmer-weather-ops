"use client";

import type { Position } from "@/lib/types";

interface Props {
  positions: Position[];
}

export default function PositionsTable({ positions }: Props) {
  const sorted = [...positions].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-text-primary tracking-wide">Positions</h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold tabular-nums ${totalPnl >= 0 ? "text-neon" : "text-red"}`}>
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
          </span>
          <span className="pill bg-purple/10 text-purple">{positions.length}</span>
        </div>
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
            const pnlPct = p.cost_basis > 0 ? (p.pnl / p.cost_basis) * 100 : 0;
            const prob = Math.max(0, Math.min(1, p.current_price));

            return (
              <div key={`${p.market_id}-${i}`} className="py-2 px-3 rounded-xl hover:bg-bg-hover transition-colors">
                <div className="flex items-center gap-3">
                  {/* Side badge */}
                  <span className={`pill shrink-0 ${side === "YES" ? "bg-neon/10 text-neon" : "bg-red/10 text-red"}`}>
                    {side}
                  </span>

                  {/* Market + details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-text-secondary truncate" title={p.question}>
                        {p.question}
                      </p>
                      {p.redeemable && (
                        <span className="pill bg-neon/20 text-neon text-[0.45rem] shrink-0">Redeem</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[0.55rem] text-text-muted tabular-nums">
                        {shares.toFixed(1)}sh @ ${p.avg_cost.toFixed(3)}
                      </span>
                      <span className="text-[0.5rem] text-text-muted/40">&rarr;</span>
                      <span className="text-[0.55rem] text-cyan tabular-nums font-semibold">
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
                    <div className={`text-[0.5rem] tabular-nums font-semibold ${isUp ? "text-neon/60" : "text-red/60"}`}>
                      {isUp ? "+" : ""}{pnlPct.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Probability bar */}
                <div className="mt-1.5 h-0.5 w-full bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${prob * 100}%`,
                      backgroundColor: side === "YES" ? "#03E78B" : "#ff4466",
                      opacity: 0.45,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
