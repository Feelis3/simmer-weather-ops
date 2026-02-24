"use client";

import type { Trade } from "@/lib/types";

interface Props {
  trades: Trade[];
}

function relativeTime(dateStr: string): string {
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function TradesTimeline({ trades }: Props) {
  const shown = trades.slice(0, 15);
  const totalBuys = trades
    .filter((t) => t.action.toLowerCase() === "buy")
    .reduce((s, t) => s + t.cost, 0);
  const totalSells = trades
    .filter((t) => t.action.toLowerCase() === "sell")
    .reduce((s, t) => s + t.cost, 0);

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-text-primary tracking-wide">Recent Trades</h3>
        <div className="flex items-center gap-2">
          <span className="text-[0.5rem] text-text-muted tabular-nums">
            <span className="text-neon">${totalSells.toFixed(1)}</span>
            <span className="text-text-muted/50"> out</span>
          </span>
          <span className="text-text-muted/30 text-[0.5rem]">·</span>
          <span className="text-[0.5rem] text-text-muted tabular-nums">
            <span className="text-red">${totalBuys.toFixed(1)}</span>
            <span className="text-text-muted/50"> in</span>
          </span>
          <span className="pill bg-cyan/10 text-cyan">{trades.length}</span>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-text-muted text-xs">No trades yet</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {shown.map((t, i) => {
            const isBuy = t.action.toLowerCase() === "buy";
            const sideIsYes = t.side.toLowerCase() === "yes";
            return (
              <div
                key={t.id || i}
                className="flex items-start gap-3 py-2 px-3 rounded-xl hover:bg-bg-hover transition-colors"
              >
                {/* Action badge */}
                <div className="shrink-0 mt-0.5 w-9">
                  <span className={`pill text-[0.55rem] ${isBuy ? "bg-red/10 text-red" : "bg-neon/10 text-neon"}`}>
                    {t.action.toUpperCase()}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-secondary truncate" title={t.market_question}>
                    {t.market_question}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[0.55rem] font-semibold tabular-nums ${sideIsYes ? "text-neon/70" : "text-red/70"}`}
                    >
                      {t.side.toUpperCase()}
                    </span>
                    <span className="text-[0.55rem] text-text-muted tabular-nums">
                      {t.shares.toFixed(1)}sh · ${t.cost.toFixed(2)}
                    </span>
                    {t.source && (
                      <span className="pill bg-purple/8 text-purple/60 text-[0.5rem]">{t.source}</span>
                    )}
                  </div>
                  {t.reasoning && (
                    <p
                      className="text-[0.5rem] text-text-muted/55 italic mt-0.5 truncate"
                      title={t.reasoning}
                    >
                      {t.reasoning}
                    </p>
                  )}
                </div>

                {/* Time */}
                <span className="text-[0.55rem] text-text-muted tabular-nums shrink-0 mt-0.5">
                  {relativeTime(t.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
