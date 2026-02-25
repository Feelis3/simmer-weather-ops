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
  const posCount = positions?.positions?.filter((p) => p.venue === "polymarket").length ?? 0;
  const winRate = account?.win_rate;
  const isOnline = !offline && !error && status != null;
  const isLoading = !offline && !error && status === null;

  return (
    <Link href={`/${owner.id}`} className="block group">
      <div
        className="relative overflow-hidden flex flex-col h-full transition-all duration-200 group-hover:-translate-y-0.5"
        style={{
          background: "#070910",
          borderRadius: 14,
          border: `1px solid ${isOnline ? owner.color + "22" : "#0e1220"}`,
          boxShadow: isOnline
            ? `0 0 0 1px ${owner.color}08, 0 20px 60px ${owner.color}06`
            : "none",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            height: 3,
            background: isOnline
              ? `linear-gradient(90deg, ${owner.color}, ${owner.color}44)`
              : `linear-gradient(90deg, #182035, transparent)`,
            borderRadius: "14px 14px 0 0",
          }}
        />

        <div className="p-5 flex flex-col gap-5 flex-1">
          {/* Header: emoji + name + status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{owner.emoji}</span>
              <div>
                <div className="text-sm font-bold text-text-primary tracking-wide">
                  {owner.name}
                </div>
                <div
                  className="text-[0.45rem] font-black tracking-[0.18em] uppercase mt-0.5"
                  style={{ color: owner.color + "70" }}
                >
                  {owner.type} Weather
                </div>
              </div>
            </div>

            {/* Status badge */}
            {offline ? (
              <span className="pill text-[0.45rem] mt-0.5" style={{ background: "#182035", color: "#4a6080" }}>
                PENDING
              </span>
            ) : error ? (
              <span className="pill text-[0.45rem] mt-0.5" style={{ background: "#ff335510", color: "#ff3358" }}>
                ERROR
              </span>
            ) : isOnline ? (
              <div className="flex items-center gap-1.5 mt-1">
                <div
                  className="w-1.5 h-1.5 rounded-full animate-pulse-neon"
                  style={{ backgroundColor: owner.color }}
                />
                <span className="text-[0.45rem] font-black tracking-widest" style={{ color: owner.color }}>
                  LIVE
                </span>
              </div>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-border animate-pulse mt-1.5" />
            )}
          </div>

          {/* Balance — Hero number */}
          <div className="flex-1">
            <div className="label-xs mb-2">Balance</div>
            {offline ? (
              <div className="stat-xl text-text-muted opacity-30">—</div>
            ) : isLoading ? (
              <div className="skeleton h-9 w-32 rounded-lg" />
            ) : (
              <div className="stat-hero animate-number" style={{ color: owner.color }}>
                ${balance.toFixed(2)}
              </div>
            )}
          </div>

          {/* Stats */}
          {!offline && !isLoading && (
            <div className="flex items-end gap-6">
              <div>
                <div className="label-xs mb-1">Positions</div>
                <div className="stat-xl" style={{ color: owner.color }}>
                  {posCount}
                </div>
              </div>
              <div>
                <div className="label-xs mb-1">Win Rate</div>
                <div className="stat-xl" style={{ color: owner.color }}>
                  {winRate != null ? `${(winRate * 100).toFixed(0)}%` : "—"}
                </div>
              </div>
            </div>
          )}

          {offline && (
            <div className="py-2">
              <p className="text-[0.6rem] text-text-secondary leading-relaxed">
                VPS not configured
              </p>
            </div>
          )}

          {/* Cities */}
          <div
            className="text-[0.5rem] font-mono leading-relaxed"
            style={{ color: owner.color + "50" }}
          >
            {owner.cities.join("  ·  ")}
          </div>
        </div>
      </div>
    </Link>
  );
}
