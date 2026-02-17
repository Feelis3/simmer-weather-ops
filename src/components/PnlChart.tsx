"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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
    <div className="panel p-2 text-xs border border-green-matrix/20 shadow-lg">
      <p className="text-green-dim/50 text-[0.5rem] mb-0.5">{d.label}</p>
      <p className={`font-bold tabular-nums ${d.pnl >= 0 ? "text-green-matrix" : "text-red-alert"}`}>
        {d.pnl >= 0 ? "+" : ""}${d.pnl.toFixed(2)}
      </p>
    </div>
  );
}

export default function PnlChart({ trades, currentPnl }: Props) {
  // Build cumulative P&L from trades (only polymarket/real trades)
  const realTrades = [...trades]
    .filter((t) => t.venue === "polymarket")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let cumPnl = 0;
  const chartData = realTrades.map((t) => {
    // BUY = spend USDC, SELL = receive USDC
    cumPnl += t.action === "sell" ? t.cost : -t.cost;
    const dt = new Date(t.created_at);
    return {
      label: `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, "0")}`,
      pnl: parseFloat(cumPnl.toFixed(2)),
    };
  });

  // Add current state as last point
  if (chartData.length > 0) {
    chartData.push({ label: "Now", pnl: parseFloat(currentPnl.toFixed(2)) });
  } else {
    chartData.push({ label: "Now", pnl: parseFloat(currentPnl.toFixed(2)) });
  }

  const minPnl = Math.min(...chartData.map((d) => d.pnl));
  const maxPnl = Math.max(...chartData.map((d) => d.pnl));
  const isPositive = currentPnl >= 0;
  const color = isPositive ? "#39ff7f" : "#f43f5e";

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-green-dim/40 text-xs">&gt;</span>
          <span className="text-[0.6rem] font-bold tracking-widest uppercase text-green-dim/40">
            P&L History
          </span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${isPositive ? "text-green-matrix" : "text-red-alert"}`}>
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
              tick={{ fill: "#2da85e40", fontSize: 8, fontFamily: "monospace" }}
              axisLine={{ stroke: "#1e2a3a40" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[Math.floor(minPnl - 0.5), Math.ceil(maxPnl + 0.5)]}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              tick={{ fill: "#2da85e40", fontSize: 8, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
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
        <p className="text-center text-[0.45rem] text-green-dim/15 mt-1">
          Chart grows as trades execute
        </p>
      )}
    </div>
  );
}
