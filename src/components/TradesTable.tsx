"use client";

import type { PolymarketActivity, SimmerTrades } from "@/lib/types";

interface Props {
  polymarket: PolymarketActivity[];
  simmer: SimmerTrades | null;
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function TradesTable({ polymarket, simmer }: Props) {
  const trades = polymarket.filter((t) => t.type === "TRADE");
  const hasActivity = trades.length > 0 || (simmer?.total_count ?? 0) > 0;

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-dim/40 text-xs">&gt;</span>
        <h2 className="text-xs font-bold tracking-widest uppercase text-green-matrix">
          Trade History
        </h2>
        <span className="ml-2 text-[0.6rem] text-cyan-glow tabular-nums">
          [{trades.length + (simmer?.total_count ?? 0)} EXECUTIONS]
        </span>
      </div>

      {!hasActivity ? (
        <div className="py-8 text-center">
          <div className="inline-block text-green-dim/20 text-xs font-mono">
            <p>&gt; TRADE LOG EMPTY</p>
            <p className="mt-1">&gt; MONITORING FOR CLAWDBOT ACTIVITY...</p>
            <div className="mt-3 h-px bg-gradient-to-r from-transparent via-green-matrix/20 to-transparent" />
            <p className="mt-3 text-[0.6rem] text-green-dim/15">
              Trades will appear here once the bot starts executing on Polymarket weather markets
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table>
            <thead className="sticky top-0 bg-terminal-dark">
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Side</th>
                <th>Market</th>
                <th>Outcome</th>
                <th>Size</th>
                <th>Price</th>
                <th>USDC</th>
                <th>TX</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={`pm-${i}`}>
                  <td className="tabular-nums text-green-dim/60 whitespace-nowrap">{timeAgo(t.timestamp)}</td>
                  <td><span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-cyan-glow/10 text-cyan-glow">{t.type}</span></td>
                  <td>
                    <span className={`text-[0.6rem] font-bold ${t.side === "BUY" ? "text-green-matrix" : "text-red-alert"}`}>
                      {t.side}
                    </span>
                  </td>
                  <td className="max-w-[180px] truncate text-green-dim" title={t.title}>{t.title}</td>
                  <td className="text-cyan-glow">{t.outcome || "—"}</td>
                  <td className="tabular-nums">{(t.size ?? 0).toFixed(2)}</td>
                  <td className="tabular-nums">${(t.price ?? 0).toFixed(4)}</td>
                  <td className="tabular-nums text-amber-warm">${(t.usdcSize ?? 0).toFixed(2)}</td>
                  <td>
                    {t.transactionHash ? (
                      <a
                        href={`https://polygonscan.com/tx/${t.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[0.6rem] text-purple-fade hover:text-purple-fade/80 underline"
                      >
                        {t.transactionHash.slice(0, 8)}...
                      </a>
                    ) : "—"}
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
