import { VPS_API } from "./constants";
import type {
  StatusResponse,
  Portfolio,
  PositionsResponse,
  TradesResponse,
  MarketsResponse,
  BtcData,
  LeaderboardData,
  CronsResponse,
  LogResponse,
} from "./types";

// ─── Server-side: fetch from VPS API directly ───────────────

async function vpsGet<T>(path: string): Promise<T> {
  const res = await fetch(`${VPS_API}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`VPS ${path}: ${res.status}`);
  return res.json();
}

async function vpsPost<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${VPS_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`VPS POST ${path}: ${res.status}`);
  return res.json();
}

// Server-side fetchers (used in API routes)
export const getStatus = () => vpsGet<StatusResponse>("/api/status");
export const getPortfolio = () => vpsGet<Portfolio>("/api/portfolio");
export const getPositions = () => vpsGet<PositionsResponse>("/api/positions");
export const getTrades = () => vpsGet<TradesResponse>("/api/trades");
export const getMarkets = () => vpsGet<MarketsResponse>("/api/markets");
export const getBtc = () => vpsGet<BtcData>("/api/btc");
export const getLeaderboard = () => vpsGet<LeaderboardData>("/api/leaderboard");
export const getCrons = () => vpsGet<CronsResponse>("/api/crons");
export const getLogs = (bot: string, lines = 100) => vpsGet<LogResponse>(`/api/logs/${bot}?lines=${lines}`);
export const toggleBot = (bot: string, enabled: boolean) => vpsPost(`/api/toggle/${bot}`, { enabled });
export const runBot = (bot: string) => vpsPost(`/api/run/${bot}`, {});
export const pauseAll = (paused: boolean) => vpsPost(`/api/pause`, { paused });
