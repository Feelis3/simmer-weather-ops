"use client";

import type { Trade } from "@/lib/types";

interface Props {
  trades: Trade[];
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function TradesTimeline({ trades }: Props) {
  const shown = trades.slice(0, 15);

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-green-dim/40 text-xs">&gt;</span>
        <span className="text-[0.6rem] font-bold tracking-widest uppercase text-green-dim/40">
          Recent Trades
        </span>
        <span className="text-[0.55rem] text-cyan-glow/60 tabular-nums">[{trades.length}]</span>
      </div>

      {shown.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-green-dim/20 text-[0.6rem]">No trades yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {shown.map((t, i) => {
            const isBuy = t.action.toLowerCase() === "buy";
            return (
              <div key={t.id || i} className="flex items-start gap-2.5 py-1.5 px-2 rounded-md hover:bg-panel-hover/30 transition-colors border-b border-panel-border/20 last:border-0">
                {/* Action badge */}
                <div className="shrink-0 mt-0.5">
                  <span className={`inline-block w-[42px] text-center py-0.5 rounded text-[0.5rem] font-bold uppercase ${
                    isBuy
                      ? "bg-green-matrix/10 text-green-matrix"
                      : "bg-amber-warm/10 text-amber-warm"
                  }`}>
                    {t.action}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[0.55rem] text-green-dim/55 truncate leading-snug" title={t.market_question}>
                    {t.market_question}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[0.45rem] text-green-dim/25 tabular-nums">
                      {t.side.toUpperCase()} &middot; {t.shares.toFixed(1)} @ ${t.cost.toFixed(3)}
                    </span>
                    {t.source && (
                      <span className="text-[0.4rem] px-1 py-0.5 rounded bg-purple-fade/8 text-purple-fade/50">
                        {t.source}
                      </span>
                    )}
                  </div>
                  {t.reasoning && (
                    <p className="text-[0.45rem] text-green-dim/20 italic mt-0.5 truncate" title={t.reasoning}>
                      {t.reasoning}
                    </p>
                  )}
                </div>

                {/* Time */}
                <span className="text-[0.45rem] text-green-dim/15 tabular-nums shrink-0 mt-0.5">
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
