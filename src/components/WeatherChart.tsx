"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { WeatherMarketData } from "@/lib/types";

interface Props {
  market: WeatherMarketData;
}

function formatPrice(p: number) {
  return `${(p * 100).toFixed(1)}%`;
}

function fmtLabel(raw: string) {
  return raw.replace(/^.*?(\d)/, "$1").replace(/orHigher|orLower/gi, "+").replace(/F$/i, "°");
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; rawLabel: string; yesPrice: number; volume: number } }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="panel p-3 text-xs border border-green-matrix/30">
      <p className="text-green-matrix font-bold mb-1">{d.rawLabel}</p>
      <p className="text-cyan-glow">Probability: {formatPrice(d.yesPrice)}</p>
      <p className="text-green-dim/60">Vol: ${d.volume.toLocaleString()}</p>
    </div>
  );
}

export default function WeatherChart({ market }: Props) {
  const data = market.buckets.map((b) => ({
    label: fmtLabel(b.label),
    rawLabel: b.label,
    yesPrice: b.yesPrice,
    volume: b.volume,
  }));

  const maxIdx = data.reduce((mi, d, i) => (d.yesPrice > data[mi].yesPrice ? i : mi), 0);

  return (
    <div className="panel p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-glow shadow-[0_0_4px_#00ffff]" />
          <h3 className="text-xs font-bold tracking-wider uppercase text-green-matrix">
            {market.city}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[0.6rem]">
          <span className="text-green-dim/40">
            VOL ${(market.volume / 1000).toFixed(1)}K
          </span>
          <span className="text-cyan-glow tabular-nums">
            PEAK {data[maxIdx]?.label} @ {formatPrice(data[maxIdx]?.yesPrice ?? 0)}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: "#00cc33", fontSize: 9, fontFamily: "monospace" }}
              axisLine={{ stroke: "#1a2332" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              tick={{ fill: "#00cc33", fontSize: 9, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#00ff4110" }} />
            <ReferenceLine y={0} stroke="#1a2332" />
            <Bar dataKey="yesPrice" radius={[2, 2, 0, 0]} maxBarSize={40}>
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={i === maxIdx ? "#00ffff" : "#00ff41"}
                  fillOpacity={i === maxIdx ? 0.9 : 0.4 + data[i].yesPrice * 0.6}
                  stroke={i === maxIdx ? "#00ffff" : "#00ff41"}
                  strokeWidth={i === maxIdx ? 1 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Price table */}
      <div className="mt-2 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-[0.55rem] py-1 px-2">Range</th>
              <th className="text-[0.55rem] py-1 px-2 text-right">Yes</th>
              <th className="text-[0.55rem] py-1 px-2 text-right">No</th>
              <th className="text-[0.55rem] py-1 px-2 text-right">Vol</th>
            </tr>
          </thead>
          <tbody>
            {market.buckets.map((b, i) => {
              const isMax = i === maxIdx;
              return (
                <tr key={i} className={isMax ? "bg-cyan-glow/5" : ""}>
                  <td className={`text-[0.6rem] py-0.5 px-2 tabular-nums ${isMax ? "text-cyan-glow font-bold" : "text-green-dim/60"}`}>
                    {fmtLabel(b.label)}
                  </td>
                  <td className={`text-[0.6rem] py-0.5 px-2 text-right tabular-nums ${isMax ? "text-cyan-glow font-bold" : "text-green-matrix"}`}>
                    {formatPrice(b.yesPrice)}
                  </td>
                  <td className="text-[0.6rem] py-0.5 px-2 text-right tabular-nums text-red-alert/50">
                    {formatPrice(b.noPrice)}
                  </td>
                  <td className="text-[0.6rem] py-0.5 px-2 text-right tabular-nums text-green-dim/30">
                    ${b.volume > 1000 ? `${(b.volume / 1000).toFixed(1)}K` : b.volume.toFixed(0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex items-center justify-between text-[0.55rem] text-green-dim/30">
        <span>SOURCE: POLYMARKET CLOB</span>
        <span>RESOLVES: {new Date(market.endDate).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
