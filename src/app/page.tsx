"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import OwnerCard from "@/components/OwnerCard";
import { OWNERS, OWNER_IDS, type OwnerId } from "@/lib/owners";
import type { StatusResponse } from "@/lib/types";

interface OwnerState {
  status: StatusResponse | null;
  error: string | null;
  offline: boolean;
}

type AllStatus = Record<OwnerId, OwnerState>;
const DEFAULT_STATE: OwnerState = { status: null, error: null, offline: false };

export default function Overview() {
  const [allStatus, setAllStatus] = useState<AllStatus>(
    Object.fromEntries(OWNER_IDS.map((id) => [id, DEFAULT_STATE])) as AllStatus
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const fetchAllStatus = useCallback(async () => {
    const results = await Promise.allSettled(
      OWNER_IDS.map((id) =>
        fetch(`/api/bots/${id}/status`, { cache: "no-store" }).then((r) => r.json())
      )
    );
    setAllStatus((prev) => {
      const next = { ...prev };
      OWNER_IDS.forEach((id, i) => {
        const res = results[i];
        if (res.status === "fulfilled") {
          const val = res.value;
          if (val.offline) next[id] = { status: null, error: null, offline: true };
          else if (val.error) next[id] = { status: null, error: val.error, offline: false };
          else next[id] = { status: val as StatusResponse, error: null, offline: false };
        } else {
          next[id] = { status: null, error: String(res.reason), offline: false };
        }
      });
      return next;
    });
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    fetchAllStatus();
    const t = setInterval(fetchAllStatus, 30000);
    return () => clearInterval(t);
  }, [fetchAllStatus]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await fetchAllStatus();
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const onlineBots = OWNER_IDS.filter((id) => allStatus[id].status != null);
  const totalBalance = onlineBots.reduce(
    (sum, id) => sum + (allStatus[id].status?.portfolio?.balance_usdc ?? 0),
    0
  );
  const totalPositions = onlineBots.reduce((sum, id) => {
    const pos = allStatus[id].status?.positions?.positions ?? [];
    return sum + pos.filter((p) => p.venue === "polymarket").length;
  }, 0);

  return (
    <div className="min-h-screen bg-bg text-text-primary">

      {/* Top utility bar */}
      <div
        className="border-b border-border"
        style={{ background: "rgba(2,4,11,0.6)" }}
      >
        <div className="max-w-[1440px] mx-auto px-5 h-9 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Chip label="Auto-refresh" value="30s" />
            <Chip label="Bots online" value={`${onlineBots.length} / ${OWNER_IDS.length}`} color="#00f5a0" />
            {totalPositions > 0 && (
              <Chip label="Positions" value={String(totalPositions)} color="#a78bfa" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30"
            >
              <svg
                width="11" height="11" viewBox="0 0 13 13" fill="none"
                className={isRefreshing ? "animate-spin-refresh" : ""}
              >
                <path d="M12 6.5A5.5 5.5 0 1 1 6.5 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M12 1v5.5H6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {lastUpdated && (
                <span className="text-[0.5rem] tabular-nums hidden sm:block">
                  {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </button>
            <div className="w-px h-3 bg-border" />
            <button
              onClick={handleLogout}
              className="text-[0.5rem] font-semibold text-text-secondary hover:text-red transition-colors tracking-wider uppercase"
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-5">

        {/* ── Hero balance ─────────────────────────── */}
        <div className="py-14 text-center animate-fade-up">
          <p className="label-xs mb-4" style={{ color: "#4a6080" }}>
            Combined Balance · {OWNER_IDS.length} Bots · Polymarket Weather
          </p>
          <div
            className="stat-hero glow-neon mb-3 tabular-nums"
            style={{ color: "#00f5a0", fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
          >
            {onlineBots.length > 0 ? `$${totalBalance.toFixed(2)}` : "———"}
          </div>
          <p className="text-[0.6rem] text-text-secondary">
            {onlineBots.length === 0
              ? "Connecting to bots..."
              : `${onlineBots.length} bot${onlineBots.length > 1 ? "s" : ""} reporting live`}
          </p>
        </div>

        {/* ── Divider ──────────────────────────────── */}
        <div
          className="h-px w-full mb-10"
          style={{ background: "linear-gradient(90deg, transparent, #0e1220 20%, #0e1220 80%, transparent)" }}
        />

        {/* ── Bot cards ────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
          {OWNER_IDS.map((id, i) => (
            <div
              key={id}
              className="animate-fade-in"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
            >
              <OwnerCard
                owner={OWNERS[id]}
                status={allStatus[id].status}
                error={allStatus[id].error ?? undefined}
                offline={allStatus[id].offline}
              />
            </div>
          ))}
        </div>

        {/* ── Coverage grid ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-12">
          <CoveragePanel
            title="🇺🇸 US Markets"
            cities={["NYC", "Chicago", "Atlanta", "Dallas", "Miami"]}
            ownerIds={["marcos", "jorge"]}
            allStatus={allStatus}
          />
          <CoveragePanel
            title="🌍 International"
            cities={["London", "Seoul", "Toronto", "Paris", "Tokyo", "Sydney"]}
            ownerIds={["mario", "jose"]}
            allStatus={allStatus}
          />
        </div>
      </main>

      {/* Footer */}
      <footer
        className="border-t border-border py-4"
        style={{ background: "rgba(2,4,11,0.5)" }}
      >
        <div className="max-w-[1440px] mx-auto px-5 flex items-center justify-between">
          <span className="label-xs" style={{ color: "#252e45" }}>
            194.163.160.76:8420
          </span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-neon" style={{ background: "#00f5a0" }} />
            <span className="text-[0.5rem] tabular-nums" style={{ color: "#252e45" }}>
              {lastUpdated?.toLocaleTimeString() ?? "---"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ───────────────────────────

function Chip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="label-xs" style={{ color: "#252e45" }}>{label}</span>
      <span
        className="text-[0.55rem] font-bold tabular-nums"
        style={{ color: color ?? "#4a6080" }}
      >
        {value}
      </span>
    </div>
  );
}

function CoveragePanel({
  title, cities, ownerIds, allStatus,
}: {
  title: string;
  cities: string[];
  ownerIds: string[];
  allStatus: AllStatus;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xs font-bold text-text-primary tracking-wide">{title}</h3>
        <div className="flex items-center gap-2">
          {ownerIds.map((id) => {
            const o = OWNERS[id as OwnerId];
            const online = allStatus[id as OwnerId]?.status != null;
            return (
              <div key={id} className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: o.color, opacity: online ? 1 : 0.2 }}
                />
                <span
                  className="text-[0.5rem] font-semibold"
                  style={{ color: online ? o.color : "#252e45" }}
                >
                  {o.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {cities.map((city) => {
          const activeBots = ownerIds.filter(
            (id) => allStatus[id as OwnerId]?.status != null
          );
          return (
            <div
              key={city}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "#0c0e1a", border: "1px solid #0e1220" }}
            >
              <div className="flex gap-1">
                {ownerIds.map((id) => (
                  <div
                    key={id}
                    className="w-1 h-1 rounded-full"
                    style={{
                      background: OWNERS[id as OwnerId].color,
                      opacity: activeBots.includes(id) ? 0.8 : 0.1,
                    }}
                  />
                ))}
              </div>
              <span className="text-[0.6rem] text-text-secondary font-mono tracking-wide">{city}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
