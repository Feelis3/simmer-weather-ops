"use client";

import type { SimmerPortfolio } from "@/lib/types";

interface Props {
  simmer: SimmerPortfolio | null;
  polymarketValue: number;
}

function StatBox({ label, value, sub, color = "text-green-matrix" }: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="panel p-4 flex flex-col gap-1">
      <span className="text-[0.6rem] uppercase tracking-widest text-green-dim/50">{label}</span>
      <span className={`text-xl font-bold ${color} tabular-nums`}>{value}</span>
      {sub && <span className="text-[0.6rem] text-green-dim/40">{sub}</span>}
    </div>
  );
}

export default function PortfolioPanel({ simmer, polymarketValue }: Props) {
  const balance = simmer?.balance_usdc ?? 0;
  const exposure = simmer?.total_exposure ?? 0;
  const pnl = simmer?.pnl_total ?? 0;
  const pnl24 = simmer?.pnl_24h;
  const positions = simmer?.positions_count ?? 0;

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-dim/40 text-xs">&gt;</span>
        <h2 className="text-xs font-bold tracking-widest uppercase text-green-matrix">
          Portfolio Overview
        </h2>
        <span className="cursor-blink text-green-matrix text-xs">&nbsp;</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatBox label="Simmer Balance" value={`$${balance.toFixed(2)}`} sub="USDC" />
        <StatBox label="PM Portfolio" value={`$${polymarketValue.toFixed(2)}`} sub="POLYMARKET" color="text-cyan-glow" />
        <StatBox label="Exposure" value={`$${exposure.toFixed(2)}`} sub="AT RISK" color="text-amber-warm" />
        <StatBox
          label="Total P&L"
          value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
          color={pnl >= 0 ? "text-green-matrix" : "text-red-alert"}
        />
        <StatBox
          label="24h P&L"
          value={pnl24 != null ? `${pnl24 >= 0 ? "+" : ""}$${pnl24.toFixed(2)}` : "---"}
          color={pnl24 == null ? "text-green-dim/30" : pnl24 >= 0 ? "text-green-matrix" : "text-red-alert"}
        />
        <StatBox label="Positions" value={String(positions)} sub="OPEN" color="text-purple-fade" />
      </div>
    </div>
  );
}
