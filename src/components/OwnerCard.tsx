"use client";

import Link from "next/link";
import { useState } from "react";
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
  const positions = status?.positions;
  const balance = portfolio?.balance_usdc ?? 0;
  const posCount = positions?.positions?.filter(
    (p) => p.venue === "polymarket" && p.current_value > 0.01
  ).length ?? 0;
  const exposure = portfolio?.total_exposure ?? 0;
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
            {/* Avatar / emoji */}
            <CardAvatar owner={owner} />
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
              <div className="text-[0.5rem] mt-0.5" style={{ color: "var(--ui-t3)" }}>
                {owner.cities.slice(0, 3).join(" · ")}
                {owner.cities.length > 3 && ` +${owner.cities.length - 3}`}
              </div>
              {owner.spotify && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span style={{ color: "#1DB954", fontSize: "0.45rem" }}>♪</span>
                  <span className="text-[0.42rem]" style={{ color: "var(--ui-t3)" }}>
                    {owner.spotify.title}
                  </span>
                </div>
              )}
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
            <span className="text-[0.6rem]" style={{ color: "var(--ui-t3)" }}>
              {offline ? "VPS not configured" : "Connection failed"}
            </span>
          </div>
        ) : (
          <>
            {/* Balance */}
            <div>
              <div className="text-[0.5rem] uppercase tracking-wider mb-1" style={{ color: "var(--ui-t3)" }}>Balance</div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: owner.color }}>
                {status ? `$${balance.toFixed(2)}` : <span className="skeleton inline-block w-24 h-6 rounded" />}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Positions" value={status ? String(posCount) : "---"} color={owner.color} />
              <Stat label="Exposure"  value={status ? `$${exposure.toFixed(2)}` : "---"} color={owner.color} />
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

/** Avatar with jpg → svg → emoji fallback */
function CardAvatar({ owner }: { owner: OwnerConfig }) {
  const [imgSrc, setImgSrc] = useState(owner.avatar ? `${owner.avatar}.jpg` : null);
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (imgSrc?.endsWith(".jpg") && owner.avatar) {
      setImgSrc(`${owner.avatar}.svg`);
    } else {
      setFailed(true);
    }
  };

  if (!imgSrc || failed) {
    return (
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ background: owner.accentDim }}
      >
        {owner.emoji}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={owner.name}
      onError={handleError}
      className="w-10 h-10 rounded-xl object-cover shrink-0"
      style={{ border: `1px solid ${owner.color}25` }}
    />
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-[0.45rem] uppercase tracking-wider mb-0.5" style={{ color: "var(--ui-t3)" }}>{label}</div>
      <div className="text-xs font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
