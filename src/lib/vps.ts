// Server-only:
//   - simmerGet → calls https://api.simmer.markets with the bot's own API key (correct per-bot data)
//   - vpsGet/vpsPost → calls VPS at BASE_URL for crons, logs, toggle, run (VPS-only operations)
import type { OwnerId } from "./owners";

const BASE_URL    = process.env.BASE_API_URL ?? "http://194.163.160.76:8420";
const SIMMER_URL  = "https://api.simmer.markets";

function getApiKey(id: OwnerId): string | null {
  switch (id) {
    case "marcos": return process.env.BOT_MARCOS_API_KEY ?? null;
    case "jorge":  return process.env.BOT_JORGE_API_KEY  ?? null;
    case "mario":  return process.env.BOT_MARIO_API_KEY  ?? null;
    case "jose":   return process.env.BOT_JOSE_API_KEY   ?? null;
  }
}

function getWallet(id: OwnerId): string | null {
  switch (id) {
    case "marcos": return process.env.POLYMARKET_WALLET_MARCOS ?? null;
    case "jorge":  return process.env.POLYMARKET_WALLET_JORGE  ?? null;
    case "mario":  return process.env.POLYMARKET_WALLET_MARIO  ?? null;
    case "jose":   return process.env.POLYMARKET_WALLET_JOSE   ?? null;
  }
}

// ─── Simmer API (per-bot data: portfolio, positions, trades) ──────────────────

export async function simmerGet<T>(id: OwnerId, path: string): Promise<T> {
  const key = getApiKey(id);
  if (!key) throw new OfflineError(id);
  const res = await fetch(`${SIMMER_URL}${path}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Simmer ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── VPS API (crons, logs, toggle, run — VPS-only operations) ────────────────

function buildVpsHeaders(id: OwnerId): Record<string, string> {
  const key    = getApiKey(id)!;
  const wallet = getWallet(id);
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  if (wallet) headers["X-Wallet-Address"] = wallet;
  return headers;
}

export async function vpsGet<T>(id: OwnerId, path: string): Promise<T> {
  const key = getApiKey(id);
  if (!key) throw new OfflineError(id);
  const res = await fetch(`${BASE_URL}${path}`, {
    cache: "no-store",
    headers: buildVpsHeaders(id),
  });
  if (!res.ok) throw new Error(`VPS ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function vpsPost<T>(
  id: OwnerId,
  path: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const key = getApiKey(id);
  if (!key) throw new OfflineError(id);
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildVpsHeaders(id),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`VPS POST ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

class OfflineError extends Error {
  offline = true;
  constructor(id: string) {
    super(`Bot ${id} has no API key configured`);
  }
}

export function isOffline(e: unknown): boolean {
  return (
    e instanceof OfflineError ||
    (e as { offline?: boolean })?.offline === true
  );
}
