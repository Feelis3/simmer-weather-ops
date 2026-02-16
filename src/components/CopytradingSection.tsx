"use client";

import type { SimmerPosition, SimmerTrade } from "@/lib/types";
import { COPYTRADING_WALLETS, STRATEGIES } from "@/lib/types";

interface Props {
  positions: SimmerPosition[];
  trades: SimmerTrade[];
  pnl: number;
}

function shortWallet(w: string) {
  return `${w.slice(0, 6)}...${w.slice(-4)}`;
}

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function CopytradingSection({ positions, trades, pnl }: Props) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-dim/40 text-xs">&gt;</span>
        <h2 className="text-xs font-bold tracking-widest uppercase text-cyan-glow">
          Copytrading — Whale Mirror
        </h2>
        <span className="ml-2 text-[0.6rem] text-green-dim/40 tabular-nums">
          [{positions.length} positions | {trades.length} trades]
        </span>
      </div>

      {/* Tracked wallets */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {COPYTRADING_WALLETS.map((w, i) => (
          <div key={w} className="panel p-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-glow shadow-[0_0_4px_#00ffff] animate-pulse" />
            <div>
              <p className="text-[0.65rem] text-cyan-glow font-bold">WHALE #{i + 1}</p>
              <a
                href={`https://polymarket.com/profile/${w}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.6rem] text-green-dim/50 hover:text-green-matrix font-mono"
              >
                {shortWallet(w)}
              </a>
            </div>
            <div className="ml-auto text-[0.55rem] text-green-dim/30">TRACKING</div>
          </div>
        ))}
      </div>

      {/* PnL bar */}
      <div className="mb-4 panel p-3 flex items-center justify-between">
        <span className="text-[0.65rem] text-green-dim/50 uppercase tracking-wider">
          Copytrading P&L
        </span>
        <span className={`text-sm font-bold tabular-nums ${pnl >= 0 ? "text-cyan-glow" : "text-red-alert"}`}>
          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
        </span>
      </div>

      {/* Positions */}
      {positions.length > 0 ? (
        <div className="mb-4">
          <p className="text-[0.6rem] text-green-dim/40 mb-2 uppercase tracking-wider">Open Positions (copied)</p>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Side</th>
                  <th>Shares</th>
                  <th>Price</th>
                  <th>P&L</th>
                  <th>Venue</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p, i) => (
                  <tr key={i}>
                    <td className="max-w-[220px] truncate text-green-dim" title={p.title}>{p.title}</td>
                    <td>
                      <span className={`px-1.5 py-0.5 rounded text-[0.6rem] font-bold ${
                        p.side.toLowerCase() === "yes" ? "bg-green-matrix/10 text-green-matrix" : "bg-red-alert/10 text-red-alert"
                      }`}>{p.side}</span>
                    </td>
                    <td className="tabular-nums">{p.shares.toFixed(2)}</td>
                    <td className="tabular-nums text-cyan-glow">${p.current_price.toFixed(4)}</td>
                    <td className={`tabular-nums font-bold ${p.pnl >= 0 ? "text-green-matrix" : "text-red-alert"}`}>
                      {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                    </td>
                    <td><span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-cyan-glow/10 text-cyan-glow">{p.venue || "PM"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mb-4 py-4 text-center">
          <p className="text-green-dim/25 text-xs">&gt; NO COPIED POSITIONS — scanning whale wallets...</p>
          <div className="mt-2 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-glow/30 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Trades */}
      {trades.length > 0 ? (
        <div>
          <p className="text-[0.6rem] text-green-dim/40 mb-2 uppercase tracking-wider">
            Recent Copytrading Executions
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
          <p className="text-green-dim/20 text-[0.6rem]">&gt; No copytrading executions yet</p>
        </div>
      )}
    </div>
  );
}
