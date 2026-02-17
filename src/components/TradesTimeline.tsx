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

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

export default function TradesTimeline({ trades }: Props) {
  const shown = trades.slice(0, 20);

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-dim/40 text-xs">&gt;</span>
        <h2 className="text-xs font-bold tracking-widest uppercase text-green-matrix">
          Recent Trades
        </h2>
        <span className="ml-2 text-[0.6rem] text-cyan-glow tabular-nums">
          [{trades.length}]
        </span>
      </div>

      {shown.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-green-dim/30 text-xs font-mono">
            &gt; NO TRADES RECORDED
          </p>
          <p className="text-green-dim/20 text-[0.6rem] mt-1">
            Timeline will populate as trades execute...
          </p>
        </div>
      ) : (
        <div className="space-y-0 relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[5px] top-2 bottom-2 w-px bg-panel-border/50" />

          {shown.map((t, i) => {
            const isBuy = t.action.toUpperCase() === "BUY";
            const isPoly = t.venue === "polymarket";

            return (
              <div key={t.id || i} className="relative pl-5 py-2 group">
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-3 w-[11px] h-[11px] rounded-full border-2 ${
                    isBuy
                      ? "border-green-matrix bg-green-matrix/20"
                      : "border-amber-warm bg-amber-warm/20"
                  }`}
                />

                {/* Trade content */}
                <div className="flex flex-col gap-1">
                  {/* Top line: time + action badge + side */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[0.5rem] text-green-dim/20 tabular-nums shrink-0">
                      {relativeTime(t.created_at)}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[0.55rem] font-bold uppercase ${
                        isBuy
                          ? "bg-green-matrix/10 text-green-matrix"
                          : "bg-amber-warm/10 text-amber-warm"
                      }`}
                    >
                      {t.action}
                    </span>
                    <span className="text-[0.55rem] text-green-dim/40">
                      {t.side}
                    </span>
                    <span className="text-[0.55rem] text-green-dim/30 tabular-nums">
                      {t.shares.toFixed(2)} @ ${t.cost.toFixed(4)}
                    </span>
                  </div>

                  {/* Market question */}
                  <p
                    className="text-[0.6rem] text-green-dim/60 leading-snug"
                    title={t.market_question}
                  >
                    {truncate(t.market_question, 80)}
                  </p>

                  {/* Tags row */}
                  <div className="flex items-center gap-1.5">
                    {isPoly ? (
                      <span className="text-[0.5rem] px-1 py-0.5 rounded bg-green-matrix/10 text-green-matrix font-bold">
                        PM
                      </span>
                    ) : (
                      <span className="text-[0.5rem] px-1 py-0.5 rounded bg-green-dim/10 text-green-dim/40 font-bold">
                        SIM
                      </span>
                    )}
                    {t.source && (
                      <span className="text-[0.5rem] px-1 py-0.5 rounded bg-purple-fade/10 text-purple-fade">
                        {t.source}
                      </span>
                    )}
                  </div>

                  {/* Reasoning */}
                  {t.reasoning && (
                    <p className="text-[0.5rem] text-green-dim/25 italic leading-snug mt-0.5">
                      {truncate(t.reasoning, 120)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
