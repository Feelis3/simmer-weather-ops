"use client";

import type { MarketItem } from "@/lib/types";

interface Props {
  markets: MarketItem[];
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

export default function MarketsTable({ markets }: Props) {
  const sorted = [...markets]
    .sort((a, b) => b.volume_24h - a.volume_24h)
    .slice(0, 15);

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-dim/40 text-xs">&gt;</span>
        <h2 className="text-xs font-bold tracking-widest uppercase text-green-matrix">
          Markets Scanner
        </h2>
        <span className="ml-2 text-[0.6rem] text-cyan-glow tabular-nums">
          [{markets.length}]
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-green-dim/30 text-xs font-mono">
            &gt; NO MARKETS DATA
          </p>
          <p className="text-green-dim/20 text-[0.6rem] mt-1">
            Scanning for opportunities...
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Question</th>
                <th>Prob</th>
                <th>Div</th>
                <th>Vol 24h</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => {
                const absDivergence = Math.abs(m.divergence * 100);
                const divColor =
                  absDivergence > 15
                    ? "text-red-alert"
                    : absDivergence > 10
                    ? "text-amber-warm"
                    : "text-green-dim/50";

                return (
                  <tr key={m.id}>
                    <td
                      className="max-w-[250px] truncate text-green-dim"
                      title={m.question}
                    >
                      {truncate(m.question, 60)}
                    </td>
                    <td className="tabular-nums text-cyan-glow">
                      {(m.current_probability * 100).toFixed(1)}%
                    </td>
                    <td className={`tabular-nums font-bold ${divColor}`}>
                      {(m.divergence * 100).toFixed(1)}%
                    </td>
                    <td className="tabular-nums text-green-dim/50">
                      {formatVolume(m.volume_24h)}
                    </td>
                    <td className="tabular-nums">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[0.55rem] font-bold ${
                          m.opportunity_score >= 0.7
                            ? "bg-green-matrix/10 text-green-matrix"
                            : m.opportunity_score >= 0.4
                            ? "bg-amber-warm/10 text-amber-warm"
                            : "bg-green-dim/10 text-green-dim/40"
                        }`}
                      >
                        {m.opportunity_score.toFixed(2)}
                      </span>
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
