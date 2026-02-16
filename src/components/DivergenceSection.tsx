"use client";

import type { DivergenceOpportunity, SimmerPosition, SimmerTrade } from "@/lib/types";

interface Props {
  opportunities: DivergenceOpportunity[];
  positions: SimmerPosition[];
  trades: SimmerTrade[];
  pnl: number;
}

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function DivergenceSection({ opportunities, positions, trades, pnl }: Props) {
  const sorted = [...opportunities].sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence));

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-dim/40 text-xs">&gt;</span>
        <h2 className="text-xs font-bold tracking-widest uppercase text-purple-fade">
          AI Divergence — Price Mismatch Scanner
        </h2>
        <span className="ml-2 text-[0.6rem] text-green-dim/40 tabular-nums">
          [{opportunities.length} opportunities]
        </span>
      </div>

      {/* PnL bar */}
      <div className="mb-4 panel p-3 flex items-center justify-between">
        <span className="text-[0.65rem] text-green-dim/50 uppercase tracking-wider">
          AI Divergence P&L
        </span>
        <span className={`text-sm font-bold tabular-nums ${pnl >= 0 ? "text-purple-fade" : "text-red-alert"}`}>
          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
        </span>
      </div>

      {/* Divergence opportunities table */}
      {sorted.length > 0 ? (
        <div className="mb-4">
          <p className="text-[0.6rem] text-green-dim/40 mb-2 uppercase tracking-wider">Divergence Opportunities</p>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Simmer AI</th>
                  <th>Polymarket</th>
                  <th>Divergence</th>
                  <th>Direction</th>
                  <th>Freshness</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((o, i) => {
                  const divAbs = Math.abs(o.divergence);
                  const isBullish = o.simmer_price > o.external_price;
                  return (
                    <tr key={i} className={divAbs > 10 ? "bg-purple-fade/5" : ""}>
                      <td className="max-w-[250px] truncate text-green-dim" title={o.market_question}>
                        {o.market_question}
                      </td>
                      <td className="tabular-nums text-purple-fade font-bold">
                        {(o.simmer_price * 100).toFixed(1)}%
                      </td>
                      <td className="tabular-nums text-cyan-glow">
                        {(o.external_price * 100).toFixed(1)}%
                      </td>
                      <td className={`tabular-nums font-bold ${
                        divAbs > 10 ? "text-amber-warm" : divAbs > 5 ? "text-green-matrix" : "text-green-dim/60"
                      }`}>
                        {o.divergence > 0 ? "+" : ""}{o.divergence.toFixed(1)}%
                      </td>
                      <td>
                        <span className={`px-1.5 py-0.5 rounded text-[0.6rem] font-bold ${
                          isBullish
                            ? "bg-green-matrix/10 text-green-matrix"
                            : "bg-red-alert/10 text-red-alert"
                        }`}>
                          {o.direction || (isBullish ? "BULLISH" : "BEARISH")}
                        </span>
                      </td>
                      <td className="text-[0.6rem] text-green-dim/40">{o.signal_freshness}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mb-4 py-4 text-center">
          <p className="text-green-dim/25 text-xs">&gt; NO DIVERGENCE OPPORTUNITIES DETECTED</p>
          <p className="text-green-dim/15 text-[0.6rem] mt-1">AI models scanning for price mismatches...</p>
          <div className="mt-3 h-px bg-gradient-to-r from-transparent via-purple-fade/20 to-transparent" />
        </div>
      )}

      {/* Positions from divergence strategy */}
      {positions.length > 0 && (
        <div className="mb-4">
          <p className="text-[0.6rem] text-green-dim/40 mb-2 uppercase tracking-wider">
            Open Divergence Positions
          </p>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Side</th>
                  <th>Shares</th>
                  <th>Price</th>
                  <th>P&L</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p, i) => (
                  <tr key={i}>
                    <td className="max-w-[250px] truncate text-green-dim" title={p.title}>{p.title}</td>
                    <td>
                      <span className={`px-1.5 py-0.5 rounded text-[0.6rem] font-bold ${
                        p.side.toLowerCase() === "yes" ? "bg-green-matrix/10 text-green-matrix" : "bg-red-alert/10 text-red-alert"
                      }`}>{p.side}</span>
                    </td>
                    <td className="tabular-nums">{p.shares.toFixed(2)}</td>
                    <td className="tabular-nums text-purple-fade">${p.current_price.toFixed(4)}</td>
                    <td className={`tabular-nums font-bold ${p.pnl >= 0 ? "text-green-matrix" : "text-red-alert"}`}>
                      {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trades from divergence */}
      {trades.length > 0 ? (
        <div>
          <p className="text-[0.6rem] text-green-dim/40 mb-2 uppercase tracking-wider">
            Recent AI Divergence Executions
          </p>
          <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
            <table>
              <thead className="sticky top-0 bg-terminal-dark">
                <tr>
                  <th>Time</th>
                  <th>Side</th>
                  <th>Market</th>
                  <th>Shares</th>
                  <th>Cost</th>
                  <th>Reasoning</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => (
                  <tr key={i}>
                    <td className="tabular-nums text-green-dim/60 whitespace-nowrap">
                      {timeAgo(t.created_at || t.timestamp)}
                    </td>
                    <td>
                      <span className={`text-[0.6rem] font-bold ${
                        t.side.toLowerCase() === "buy" || t.side.toLowerCase() === "yes"
                          ? "text-green-matrix" : "text-red-alert"
                      }`}>{t.side}</span>
                    </td>
                    <td className="max-w-[200px] truncate text-green-dim" title={t.market_question || t.title}>
                      {t.market_question || t.title}
                    </td>
                    <td className="tabular-nums">{t.shares.toFixed(2)}</td>
                    <td className="tabular-nums text-amber-warm">${(t.cost ?? t.amount).toFixed(2)}</td>
                    <td className="max-w-[200px] truncate text-green-dim/40 text-[0.6rem]" title={t.reasoning}>
                      {t.reasoning || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-3 text-center">
          <p className="text-green-dim/20 text-[0.6rem]">&gt; No divergence executions yet</p>
        </div>
      )}
    </div>
  );
}
