"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SimmerPortfolio, SimmerTrade, SourcePnl } from "@/lib/types";
import { STRATEGY_LABELS, STRATEGY_COLORS, STRATEGIES } from "@/lib/types";

interface Props {
  simmer: SimmerPortfolio | null;
  polymarketValue: number;
  trades: SimmerTrade[];
}

function StatBox({ label, value, sub, color = "text-green-matrix" }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="panel p-3 flex flex-col gap-1">
      <span className="text-[0.55rem] uppercase tracking-widest text-green-dim/50">{label}</span>
      <span className={`text-lg font-bold ${color} tabular-nums`}>{value}</span>
      {sub && <span className="text-[0.55rem] text-green-dim/40">{sub}</span>}
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
    <div className="panel p-2 text-xs border border-green-matrix/30">
      <p className="text-green-dim/60">{d.label}</p>
      <p className={`font-bold ${d.pnl >= 0 ? "text-green-matrix" : "text-red-alert"}`}>
        {d.pnl >= 0 ? "+" : ""}${d.pnl.toFixed(2)}
      </p>
    </div>
  );
}

export default function OverviewPanel({ simmer, polymarketValue, trades }: Props) {
  const balance = simmer?.balance_usdc ?? 0;
  const exposure = simmer?.total_exposure ?? 0;
  const pnlTotal = simmer?.pnl_total ?? 0;
  const pnl24 = simmer?.pnl_24h;
  const posCount = simmer?.positions_count ?? 0;
  const totalTrades = trades.length;

  // Per-strategy PnL from by_source
  const bySource = simmer?.by_source ?? {};
  const strategyKeys = Object.values(STRATEGIES);

  // Build cumulative PnL chart data from trades sorted by time
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.created_at || a.timestamp).getTime() - new Date(b.created_at || b.timestamp).getTime()
  );
  let cumPnl = 0;
  const chartData = sortedTrades.map((t) => {
    const profit = (t.price - (t.cost ?? t.amount) / Math.max(t.shares, 0.01));
    cumPnl += profit * t.shares;
    const dt = new Date(t.created_at || t.timestamp);
    return {
      label: `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, "0")}`,
      pnl: cumPnl,
    };
  });

  // If no trades, show flat line
  if (chartData.length === 0) {
    chartData.push({ label: "now", pnl: pnlTotal });
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-dim/40 text-xs">&gt;</span>
        <h2 className="text-xs font-bold tracking-widest uppercase text-green-matrix">
          Dashboard Overview
        </h2>
        <span className="cursor-blink text-green-matrix text-xs">&nbsp;</span>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <StatBox label="Balance" value={`$${balance.toFixed(2)}`} sub="USDC" />
        <StatBox label="PM Portfolio" value={`$${polymarketValue.toFixed(2)}`} sub="POLYMARKET" color="text-cyan-glow" />
        <StatBox label="Exposure" value={`$${exposure.toFixed(2)}`} sub="AT RISK" color="text-amber-warm" />
        <StatBox
          label="Total P&L"
          value={`${pnlTotal >= 0 ? "+" : ""}$${pnlTotal.toFixed(2)}`}
          color={pnlTotal >= 0 ? "text-green-matrix" : "text-red-alert"}
        />
        <StatBox label="Positions" value={String(posCount)} sub="OPEN" color="text-purple-fade" />
        <StatBox label="Trades" value={String(totalTrades)} sub="TOTAL" color="text-cyan-glow" />
      </div>

      {/* Strategy PnL breakdown + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Strategy cards */}
        <div className="space-y-3">
          <p className="text-[0.6rem] text-green-dim/40 uppercase tracking-wider">P&L by Strategy</p>
          {strategyKeys.map((key) => {
            const data: SourcePnl | undefined = bySource[key] as SourcePnl | undefined;
            const sPnl = data?.pnl ?? 0;
            const sPos = data?.positions ?? 0;
            const sTrades = data?.trades ?? 0;
            const label = STRATEGY_LABELS[key] ?? key;
            const color = STRATEGY_COLORS[key] ?? "#00ff41";
            return (
              <div key={key} className="panel p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
                  <div>
                    <p className="text-[0.65rem] font-bold" style={{ color }}>{label}</p>
                    <p className="text-[0.55rem] text-green-dim/30">{sPos} pos · {sTrades} trades</p>
                  </div>
                </div>
                <span className={`text-sm font-bold tabular-nums ${sPnl >= 0 ? "text-green-matrix" : "text-red-alert"}`}>
                  {sPnl >= 0 ? "+" : ""}${sPnl.toFixed(2)}
                </span>
              </div>
            );
          })}

          {/* 24h PnL */}
          <div className="panel p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-warm shadow-[0_0_4px_#ffaa00]" />
              <p className="text-[0.65rem] font-bold text-amber-warm">24h P&L</p>
            </div>
            <span className={`text-sm font-bold tabular-nums ${
              pnl24 == null ? "text-green-dim/30" : pnl24 >= 0 ? "text-green-matrix" : "text-red-alert"
            }`}>
              {pnl24 != null ? `${pnl24 >= 0 ? "+" : ""}$${pnl24.toFixed(2)}` : "---"}
            </span>
          </div>
        </div>

        {/* Cumulative PnL chart */}
        <div className="lg:col-span-2 panel p-4">
          <p className="text-[0.6rem] text-green-dim/40 uppercase tracking-wider mb-3">Cumulative P&L</p>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff41" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00ff41" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#00cc33", fontSize: 8, fontFamily: "monospace" }}
                  axisLine={{ stroke: "#1a2332" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                  tick={{ fill: "#00cc33", fontSize: 8, fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke="#00ff41"
                  strokeWidth={2}
                  fill="url(#pnlGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {chartData.length <= 1 && (
            <p className="text-center text-[0.55rem] text-green-dim/20 mt-2">
              Chart will populate as trades are executed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
