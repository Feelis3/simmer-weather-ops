"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import OwnerCard from "@/components/OwnerCard";
import BtcWidget from "@/components/BtcWidget";
import { OWNERS, OWNER_IDS, type OwnerId } from "@/lib/owners";
import type { StatusResponse, BtcData } from "@/lib/types";

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
  const [btc, setBtc] = useState<BtcData | null>(null);
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
          if (val.offline) {
            next[id] = { status: null, error: null, offline: true };
          } else if (val.error) {
            next[id] = { status: null, error: val.error, offline: false };
          } else {
            next[id] = { status: val as StatusResponse, error: null, offline: false };
          }
        } else {
          next[id] = { status: null, error: String(res.reason), offline: false };
        }
      });
      return next;
    });
    setLastUpdated(new Date());
  }, []);

  const fetchBtc = useCallback(async () => {
    try {
      const data = await fetch("/api/btc").then((r) => r.json());
      if (!data.error) setBtc(data);
    } catch {}
  }, []);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await Promise.all([fetchAllStatus(), fetchBtc()]);
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  useEffect(() => {
    fetchAllStatus();
    fetchBtc();
    const t1 = setInterval(fetchAllStatus, 30000);
    const t2 = setInterval(fetchBtc, 15000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [fetchAllStatus, fetchBtc]);

  const onlineBots = OWNER_IDS.filter((id) => allStatus[id].status != null);
  const totalBalance = onlineBots.reduce(
    (sum, id) => sum + (allStatus[id].status?.portfolio?.balance_usdc ?? 0),
    0
  );
  const totalPnl = onlineBots.reduce((sum, id) => {
    const s = allStatus[id].status;
    return sum + (s?.account?.polymarket_pnl ?? s?.portfolio?.pnl_total ?? 0);
  }, 0);
  const totalPositions = onlineBots.reduce((sum, id) => {
    const positions = allStatus[id].status?.positions?.positions ?? [];
    return sum + positions.filter((p) => p.venue === "polymarket").length;
  }, 0);

  return (
    <div className="min-h-screen bg-bg text-text-primary font-sans">
      {/* Header */}
      <header
        className="border-b border-border sticky top-0 z-50"
        style={{ background: "rgba(11,18,41,0.88)", backdropFilter: "blur(16px)" }}
      >
        <div className="max-w-[1440px] mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(3,231,139,0.12)" }}>
              <span className="text-neon text-[0.6rem] font-black">C</span>
            </div>
            <span className="text-text-primary font-bold text-sm tracking-wider">CLAWDBOT</span>
            <span className="text-text-muted text-xs">/</span>
            <span className="text-pink text-[0.6rem] font-semibold tracking-widest">WEATHER</span>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto">
            <HeaderStat
              label="TOTAL USDC"
              value={onlineBots.length ? `$${totalBalance.toFixed(2)}` : "---"}
              color="text-neon"
            />
            <Sep />
            <HeaderStat
              label="COMBINED P&L"
              value={onlineBots.length ? `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}` : "---"}
              color={totalPnl >= 0 ? "text-neon" : "text-red"}
            />
            <Sep />
            <HeaderStat label="POSITIONS" value={onlineBots.length ? String(totalPositions) : "---"} color="text-purple" />
            <Sep />
            <BtcWidget data={btc} />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title={lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()}` : "Refresh"}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-text-muted hover:text-neon hover:bg-neon/8 transition-all disabled:opacity-40"
            >
              <svg
                width="13" height="13" viewBox="0 0 13 13" fill="none"
                className={isRefreshing ? "animate-spin-refresh" : ""}
              >
                <path d="M12 6.5A5.5 5.5 0 1 1 6.5 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M12 1v5.5H6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {lastUpdated && !isRefreshing && (
                <span className="text-[0.5rem] tabular-nums hidden sm:block">
                  {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
              {isRefreshing && <span className="text-[0.5rem] text-neon hidden sm:block">sync…</span>}
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={handleLogout}
              className="text-[0.55rem] font-medium text-text-muted hover:text-red transition-all px-2 py-1"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-5 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard
            label="Combined Balance"
            value={`$${totalBalance.toFixed(2)}`}
            color="#03E78B"
            sub={`${onlineBots.length}/${OWNER_IDS.length} bots online`}
          />
          <SummaryCard
            label="Combined P&L"
            value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`}
            color={totalPnl >= 0 ? "#03E78B" : "#ff4466"}
          />
          <SummaryCard label="Open Positions" value={String(totalPositions)} color="#a78bfa" />
          <SummaryCard
            label="Bots Live"
            value={`${onlineBots.length} / ${OWNER_IDS.length}`}
            color="#22d3ee"
          />
        </div>

        {/* Bot cards */}
        <div>
          <h2 className="text-[0.6rem] font-semibold text-text-muted uppercase tracking-wider mb-4">
            Trading Bots
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {OWNER_IDS.map((id) => (
              <OwnerCard
                key={id}
                owner={OWNERS[id]}
                status={allStatus[id].status}
                error={allStatus[id].error ?? undefined}
                offline={allStatus[id].offline}
              />
            ))}
          </div>
        </div>

        {/* Coverage panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CoverageCard
            title="🇺🇸 US Cities"
            cities={["NYC", "Chicago", "Atlanta", "Dallas", "Miami"]}
            bots={["marcos", "jorge"]}
            allStatus={allStatus}
          />
          <CoverageCard
            title="🌍 International"
            cities={["London", "Seoul", "Toronto", "Paris", "Tokyo", "Sydney"]}
            bots={["mario", "jose"]}
            allStatus={allStatus}
          />
        </div>
      </main>

      <footer className="border-t border-border mt-8 py-3">
        <div className="max-w-[1440px] mx-auto px-5 flex items-center justify-between">
          <span className="text-[0.55rem] text-text-muted">194.163.160.76:8420 · auto-refresh 30s</span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-neon/40 animate-pulse-neon" />
            <span className="text-[0.55rem] text-text-muted tabular-nums">
              {lastUpdated?.toLocaleTimeString() ?? "---"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Local components ────────────────────────────────────

function HeaderStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="hidden md:flex items-center gap-1.5">
      <span className="text-[0.5rem] text-text-muted uppercase tracking-wider">{label}</span>
      <span className={`text-[0.7rem] font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function Sep() {
  return <div className="hidden md:block w-px h-4 bg-border" />;
}

function SummaryCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="card p-4 animate-fade-in">
      <div className="text-[0.5rem] text-text-muted uppercase tracking-wider mb-2">{label}</div>
      <div className="text-xl font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-[0.5rem] text-text-muted mt-1">{sub}</div>}
    </div>
  );
}

function CoverageCard({
  title,
  cities,
  bots,
  allStatus,
}: {
  title: string;
  cities: string[];
  bots: string[];
  allStatus: AllStatus;
}) {
  const onlineColors = bots
    .filter((b) => allStatus[b as OwnerId]?.status != null)
    .map((b) => OWNERS[b as OwnerId].color);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-text-primary">{title}</h3>
        <div className="flex items-center gap-1">
          {bots.map((b) => {
            const o = OWNERS[b as OwnerId];
            const online = allStatus[b as OwnerId]?.status != null;
            return (
              <span
                key={b}
                className="text-[0.5rem] px-1.5 py-0.5 rounded font-semibold"
                style={{ background: o.color + (online ? "20" : "08"), color: o.color + (online ? "ff" : "50") }}
              >
                {o.name}
              </span>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {cities.map((city) => (
          <div
            key={city}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{ background: "rgba(27,45,74,0.5)" }}
          >
            {onlineColors.map((c, i) => (
              <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: c }} />
            ))}
            <span className="text-[0.6rem] text-text-secondary font-mono">{city}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
