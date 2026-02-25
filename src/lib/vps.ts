// Server-only: reads env vars and proxies to each bot's VPS.
import type { OwnerId } from "./owners";

export function getVpsUrl(id: OwnerId): string | null {
  switch (id) {
    case "marcos":
      return process.env.BOT_MARCOS_VPS_URL ?? "http://194.163.160.76:8420";
    case "jorge":
      return process.env.BOT_JORGE_VPS_URL ?? null;
    case "mario":
      return process.env.BOT_MARIO_VPS_URL ?? null;
    case "jose":
      return process.env.BOT_JOSE_VPS_URL ?? null;
  }
}

export async function vpsGet<T>(id: OwnerId, path: string): Promise<T> {
  const url = getVpsUrl(id);
  if (!url) throw new OfflineError(id);
  const res = await fetch(`${url}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`VPS ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function vpsPost<T>(
  id: OwnerId,
  path: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const url = getVpsUrl(id);
  if (!url) throw new OfflineError(id);
  const res = await fetch(`${url}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`VPS POST ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

class OfflineError extends Error {
  offline = true;
  constructor(id: string) {
    super(`Bot ${id} not configured`);
  }
}

export function isOffline(e: unknown): boolean {
  return e instanceof OfflineError || (e as { offline?: boolean })?.offline === true;
}
