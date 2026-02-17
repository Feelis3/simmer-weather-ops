"use client";

import type { Position } from "@/lib/types";

interface Props {
  positions: Position[];
}

export default function PositionsTable({ positions }: Props) {
  const sorted = [...positions].sort(
    (a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)
  );

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-dim/40 text-xs">&gt;</span>
        <h2 className="text-xs font-bold tracking-widest uppercase text-green-matrix">
          Active Positions
        </h2>
        <span className="ml-2 text-[0.6rem] text-cyan-glow tabular-nums">
          [{positions.length}]
        </span>
      </div>

      {positions.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-green-dim/30 text-xs font-mono">
            &gt; NO ACTIVE POSITIONS DETECTED
          </p>
          <p className="text-green-dim/20 text-[0.6rem] mt-1">
            Waiting for bots to execute trades...
          </p>
          <div className="mt-4 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-green-matrix/30 animate-pulse"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Market</th>
                <th>Side</th>
                <th>Shares</th>
                <th>Entry</th>
                <th>Current</th>
                <th>P&L</th>
                <th>Venue</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const side =
                  p.shares_yes > 0 ? "YES" : p.shares_no > 0 ? "NO" : "---";
                const shares =
                  p.shares_yes > 0
                    ? p.shares_yes
                    : p.shares_no > 0
                    ? p.shares_no
                    : 0;
                const isPoly = p.venue === "polymarket";

                return (
                  <tr key={`${p.market_id}-${i}`}>
                    <td
                      className="max-w-[200px] truncate text-green-dim"
                      title={p.question}
                    >
                      {p.question}
                    </td>
                    <td>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[0.6rem] font-bold ${
                          side === "YES"
                            ? "bg-green-matrix/10 text-green-matrix"
                            : side === "NO"
                            ? "bg-red-alert/10 text-red-alert"
                            : "bg-green-dim/10 text-green-dim/40"
                        }`}
                      >
                        {side}
                      </span>
                    </td>
                    <td className="tabular-nums">{shares.toFixed(2)}</td>
                    <td className="tabular-nums text-cyan-glow">
                      ${p.avg_cost.toFixed(4)}
                    </td>
                    <td className="tabular-nums">
                      ${p.current_price.toFixed(4)}
                    </td>
                    <td
                      className={`tabular-nums font-bold ${
                        p.pnl >= 0 ? "text-green-matrix" : "text-red-alert"
                      }`}
                    >
                      {p.pnl >= 0 ? "+" : ""}
                      {p.pnl.toFixed(2)}{" "}
                      <span className="text-[0.5rem] font-normal text-green-dim/30">
                        {p.currency}
                      </span>
                    </td>
                    <td>
                      {isPoly ? (
                        <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-green-matrix/10 text-green-matrix font-bold">
                          PM
                        </span>
                      ) : (
                        <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-green-dim/10 text-green-dim/40 font-bold">
                          SIM
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
