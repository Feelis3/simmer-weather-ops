"use client";

import Link from "next/link";
import type { OwnerConfig } from "@/lib/owners";
import type { StatusResponse } from "@/lib/types";

interface Props {
  owner: OwnerConfig;
  status: StatusResponse | null;
  error?: string;
  offline?: boolean;
}

export default function OwnerCard({ owner, status, error, offline }: Props) {
  const portfolio = status?.portfolio;
  const account = status?.account;
  const positions = status?.positions;
  const balance = portfolio?.balance_usdc ?? 0;
  const pnl = account?.polymarket_pnl ?? portfolio?.pnl_total ?? 0;
  const posCount = positions?.positions?.filter((p) => p.venue === "polymarket").length ?? 0;
  const winRate = account?.win_rate;
  const isOnline = !offline && !error && status != null;

  return (
    <Link href={`/${owner.id}`} className="block group">
      <div
        className="card p-5 flex flex-col gap-4 transition-all group-hover:scale-[1.015]"
        style={{
          borderColor: isOnline ? owner.color + "30" : undefined,
          boxShadow: isOnline ? `0 0 24px ${owner.color}08` : undefined,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ background: owner.accentDim }}
            >
              {owner.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: owner.color }}>
                  {owner.name}
                </span>
                <span
                  className="text-[0.45rem] px-1.5 py-0.5 rounded font-bold tracking-widest uppercase"
                  style={{ background: owner.color + "15", color: owner.color + "cc" }}
                >
                  {owner.type}
                </span>
              </div>
              <div className="text-[0.5rem] text-text-muted mt-0.5">
                {owner.cities.slice(0, 3).join(" · ")}
                {owner.cities.length > 3 && ` +${owner.cities.length - 3}`}
              </div>
            </div>
          </div>

          {/* Status dot */}
          <div className="flex items-center gap-1.5 mt-1">
            {offline ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                <span className="text-[0.5rem] text-text-muted font-semibold">PENDING</span>
              </>
            ) : error ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-red" />
                <span className="text-[0.5rem] text-red font-semibold">ERROR</span>
              </>
            ) : isOnline ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse-neon" style={{ backgroundColor: owner.color }} />
                <span className="text-[0.5rem] font-semibold" style={{ color: owner.color }}>LIVE</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-pulse" />
                <span className="text-[0.5rem] text-text-muted">LOADING</span>
              </>
            )}
          </div>
        </div>

        {/* Offline/error state */}
        {(offline || error) ? (
          <div className="flex-1 flex items-center justify-center py-4">
            <span className="text-[0.6rem] text-text-muted">
              {offline ? "VPS not configured" : "Connection failed"}
            </span>
          </div>
        ) : (
          <>
            {/* Balance */}
            <div>
              <div className="text-[0.5rem] text-text-muted uppercase tracking-wider mb-1">Balance</div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: owner.color }}>
                {status ? `$${balance.toFixed(2)}` : <span className="skeleton inline-block w-24 h-6 rounded" />}
              </div>
            </div>

            {/* P&L + positions row */}
            <div className="grid grid-cols-3 gap-3">
              <Stat
                label="P&L"
                value={status ? `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}` : "---"}
                color={pnl >= 0 ? "#03E78B" : "#ff4466"}
              />
              <Stat
                label="Positions"
                value={status ? String(posCount) : "---"}
                color={owner.color}
              />
              <Stat
                label="Win Rate"
                value={
                  status && winRate != null
                    ? `${(winRate * 100).toFixed(0)}%`
                    : "---"
                }
                color={owner.color}
              />
            </div>
          </>
        )}

        {/* Arrow */}
        <div
          className="flex items-center justify-end gap-1 text-[0.5rem] font-semibold transition-all"
          style={{ color: owner.color + "80" }}
        >
          <span>View dashboard</span>
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-[0.45rem] text-text-muted uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-xs font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
