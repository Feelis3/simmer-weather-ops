"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { Trade } from "@/lib/types";

interface Props {
  trades: Trade[];
  currentPnl: number;
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; pnl: number } }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="card p-2.5 text-xs border border-border-light shadow-xl">
      <p className="text-text-muted text-[0.55rem] mb-0.5">{d.label}</p>
      <p className={`font-bold tabular-nums ${d.pnl >= 0 ? "text-neon" : "text-red"}`}>
        {d.pnl >= 0 ? "+" : ""}${d.pnl.toFixed(2)}
      </p>
    </div>
  );
}

export default function PnlChart({ trades, currentPnl }: Props) {
  const realTrades = [...trades]
    .filter((t) => t.venue === "polymarket")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let cumPnl = 0;
  const chartData = realTrades.map((t) => {
    cumPnl += t.action === "sell" ? t.cost : -t.cost;
    const dt = new Date(t.created_at);
    return {
      label: `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, "0")}`,
      pnl: parseFloat(cumPnl.toFixed(2)),
    };
  });

  chartData.push({ label: "Now", pnl: parseFloat(currentPnl.toFixed(2)) });

  const minPnl = Math.min(0, ...chartData.map((d) => d.pnl));
  const maxPnl = Math.max(0, ...chartData.map((d) => d.pnl));
  const isPositive = currentPnl >= 0;
  const color = isPositive ? "#03E78B" : "#ff4466";

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-text-primary tracking-wide">
          P&L History
        </h3>
        <span className={`text-sm font-bold tabular-nums ${isPositive ? "text-neon glow-neon" : "text-red"}`}>
          {isPositive ? "+" : ""}${currentPnl.toFixed(2)}
        </span>
      </div>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: "#444", fontSize: 9, fontFamily: "var(--font-mono)" }}
              axisLine={{ stroke: "#1a1a1a" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[Math.floor(minPnl - 0.5), Math.ceil(maxPnl + 0.5)]}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              tick={{ fill: "#444", fontSize: 9, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <ReferenceLine y={0} stroke="#2a2a2a" strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke={color}
              strokeWidth={1.5}
              fill="url(#pnlGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {chartData.length <= 2 && (
        <p className="text-center text-[0.55rem] text-text-muted mt-2">
          Chart grows as trades execute
        </p>
      )}
    </div>
  );
}
