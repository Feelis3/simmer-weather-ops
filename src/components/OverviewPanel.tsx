"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PolymarketPosition, PolymarketActivity } from "@/lib/types";

interface Props {
  portfolio: {
    portfolio_value: number;
    total_pnl: number;
    total_exposure: number;
    positions_count: number;
  } | null;
  positions: PolymarketPosition[];
  trades: PolymarketActivity[];
}

function StatCard({ label, value, sub, color = "text-green-matrix", accent }: {
  label: string; value: string; sub?: string; color?: string; accent?: string;
}) {
  return (
    <div className="panel p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[0.55rem] uppercase tracking-widest text-green-dim/30 font-medium">{label}</span>
        {accent && (
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 4px ${accent}40` }} />
        )}
      </div>
      <span className={`text-xl font-bold ${color} tabular-nums leading-none`}>{value}</span>
      {sub && <span className="text-[0.5rem] text-green-dim/20">{sub}</span>}
    </div>
  );
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; pnl: number } }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="panel p-2.5 text-xs border border-green-matrix/20 shadow-lg">
      <p className="text-green-dim/50 text-[0.55rem] mb-0.5">{d.label}</p>
      <p className={`font-bold tabular-nums ${d.pnl >= 0 ? "text-green-matrix" : "text-red-alert"}`}>
        {d.pnl >= 0 ? "+" : ""}${d.pnl.toFixed(2)}
      </p>
    </div>
  );
}

export default function OverviewPanel({ portfolio, positions, trades }: Props) {
  const portfolioValue = portfolio?.portfolio_value ?? 0;
  const totalPnl = portfolio?.total_pnl ?? 0;
  const totalExposure = portfolio?.total_exposure ?? 0;
  const posCount = portfolio?.positions_count ?? 0;

  const onlyTrades = useMemo(() =>
    trades.filter((t) => t.type === "TRADE"),
    [trades]
  );

  // Build cumulative P&L chart from real trades
  // Sort trades by timestamp (oldest first), then accumulate realized P&L
  const chartData = useMemo(() => {
    if (onlyTrades.length === 0) {
      return [{ label: "now", pnl: totalPnl }];
    }

    const sorted = [...onlyTrades].sort((a, b) => a.timestamp - b.timestamp);
    let cumPnl = 0;
    return sorted.map((t) => {
      // Each trade: if BUY, cost is negative (spending). If SELL, the difference is profit.
      // usdcSize is the dollar value of the trade.
      // For a simple cumulative view, we track the net flow:
      // BUY = -usdcSize (money out), SELL = +usdcSize (money in)
      const flow = t.side === "BUY" ? -(t.usdcSize ?? 0) : (t.usdcSize ?? 0);
      cumPnl += flow;
      const dt = new Date(t.timestamp * 1000);
      return {
        label: `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, "0")}`,
        pnl: cumPnl,
      };
    });
  }, [onlyTrades, totalPnl]);

  // Realized P&L from closed positions
  const realizedPnl = useMemo(() =>
    positions.reduce((sum, p) => sum + (p.realizedPnl ?? 0), 0),
    [positions]
  );

  // Unrealized P&L
  const unrealizedPnl = useMemo(() =>
    positions.reduce((sum, p) => sum + (p.cashPnl ?? 0), 0),
    [positions]
  );

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Portfolio Value" value={`$${portfolioValue.toFixed(2)}`} sub="POLYMARKET" accent="#22d3ee" color="text-cyan-glow" />
        <StatCard label="Exposure" value={`$${totalExposure.toFixed(2)}`} sub="CURRENT VALUE" color="text-amber-warm" accent="#f59e0b" />
        <StatCard
          label="Unrealized P&L"
          value={`${unrealizedPnl >= 0 ? "+" : ""}$${unrealizedPnl.toFixed(2)}`}
          color={unrealizedPnl >= 0 ? "text-green-matrix" : "text-red-alert"}
          accent={unrealizedPnl >= 0 ? "#39ff7f" : "#f43f5e"}
        />
        <StatCard
          label="Realized P&L"
          value={`${realizedPnl >= 0 ? "+" : ""}$${realizedPnl.toFixed(2)}`}
          color={realizedPnl >= 0 ? "text-green-matrix" : "text-red-alert"}
          accent={realizedPnl >= 0 ? "#39ff7f" : "#f43f5e"}
        />
        <StatCard label="Positions" value={String(posCount)} sub="OPEN" color="text-purple-fade" accent="#a78bfa" />
        <StatCard label="Trades" value={String(onlyTrades.length)} sub="EXECUTED" color="text-cyan-glow" accent="#22d3ee" />
      </div>

      {/* Chart */}
      <div className="panel p-4">
        <p className="text-[0.55rem] text-green-dim/25 uppercase tracking-wider font-medium mb-3">Cumulative P&L</p>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#39ff7f" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#39ff7f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: "#2da85e60", fontSize: 8, fontFamily: "monospace" }}
                axisLine={{ stroke: "#1e2a3a40" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                tick={{ fill: "#2da85e60", fontSize: 8, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke="#39ff7f"
                strokeWidth={1.5}
                fill="url(#pnlGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {chartData.length <= 1 && (
          <p className="text-center text-[0.5rem] text-green-dim/15 mt-2">
            Chart populates as trades execute
          </p>
        )}
      </div>
    </div>
  );
}
