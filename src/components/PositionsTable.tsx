"use client";

import type { PolymarketPosition } from "@/lib/types";

interface Props {
  positions: PolymarketPosition[];
}

export default function PositionsTable({ positions }: Props) {
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
            Waiting for trades to execute...
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
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table>
            <thead className="sticky top-0 bg-terminal-dark">
              <tr>
                <th>Market</th>
                <th>Outcome</th>
                <th>Size</th>
                <th>Avg Price</th>
                <th>Cur Price</th>
                <th>P&L ($)</th>
                <th>P&L (%)</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => (
                <tr key={`pm-${i}`}>
                  <td className="max-w-[200px] truncate text-green-dim" title={p.title}>{p.title}</td>
                  <td>
                    <span className={`px-1.5 py-0.5 rounded text-[0.6rem] font-bold ${
                      p.outcome === "Yes" ? "bg-green-matrix/10 text-green-matrix" : "bg-red-alert/10 text-red-alert"
                    }`}>{p.outcome}</span>
                  </td>
                  <td className="tabular-nums">{p.size.toFixed(2)}</td>
                  <td className="tabular-nums text-cyan-glow">${p.avgPrice.toFixed(4)}</td>
                  <td className="tabular-nums">${p.curPrice.toFixed(4)}</td>
                  <td className={`tabular-nums font-bold ${p.cashPnl >= 0 ? "text-green-matrix" : "text-red-alert"}`}>
                    {p.cashPnl >= 0 ? "+" : ""}${p.cashPnl.toFixed(2)}
                  </td>
                  <td className={`tabular-nums ${p.percentPnl >= 0 ? "text-green-matrix" : "text-red-alert"}`}>
                    {p.percentPnl >= 0 ? "+" : ""}{p.percentPnl.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
