// Server-only: single BASE_API_URL, differentiates bots by their individual API key.
import type { OwnerId } from "./owners";

const BASE_URL =
  process.env.BASE_API_URL ?? "http://194.163.160.76:8420";

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

function buildHeaders(id: OwnerId): Record<string, string> {
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
    headers: buildHeaders(id),
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
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
      ...buildHeaders(id),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API POST ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

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
