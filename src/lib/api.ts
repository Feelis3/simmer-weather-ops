import {
  SIMMER_API,
  POLYMARKET_DATA_API,
  POLYMARKET_GAMMA_API,
  VPS_DATA_URL,
  CITY_SERIES,
  type City,
} from "./constants";
import type {
  SimmerPortfolio,
  SimmerPositions,
  SimmerTrades,
  SimmerBriefing,
  PolymarketPosition,
  PolymarketActivity,
  GammaEvent,
  WeatherMarketData,
  TempBucket,
  Execution,
  VPSPortfolio,
  VPSPositions,
  VPSTrade,
  DivergenceOpportunity,
} from "./types";

// --- Simmer API ---

const simmerHeaders = () => ({
  Authorization: `Bearer ${process.env.SIMMER_API_KEY}`,
  "Content-Type": "application/json",
});

export async function getSimmerPortfolio(): Promise<SimmerPortfolio> {
  const res = await fetch(`${SIMMER_API}/api/sdk/portfolio`, {
    headers: simmerHeaders(),
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Simmer portfolio: ${res.status}`);
  return res.json();
}

export async function getSimmerPositions(): Promise<SimmerPositions> {
  const res = await fetch(`${SIMMER_API}/api/sdk/positions`, {
    headers: simmerHeaders(),
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Simmer positions: ${res.status}`);
  return res.json();
}

export async function getSimmerTrades(limit = 100): Promise<SimmerTrades> {
  const res = await fetch(`${SIMMER_API}/api/sdk/trades?limit=${limit}`, {
    headers: simmerHeaders(),
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Simmer trades: ${res.status}`);
  return res.json();
}

export async function getSimmerBriefing(): Promise<SimmerBriefing> {
  const res = await fetch(`${SIMMER_API}/api/sdk/briefing`, {
    headers: simmerHeaders(),
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Simmer briefing: ${res.status}`);
  return res.json();
}

// --- Polymarket Data API ---

const wallet = () => process.env.POLYMARKET_WALLET!;

export async function getPolymarketPositions(): Promise<PolymarketPosition[]> {
  const res = await fetch(
    `${POLYMARKET_DATA_API}/positions?user=${wallet()}&limit=500&sortBy=CURRENT&sortDirection=DESC`,
    { next: { revalidate: 30 } }
  );
  if (!res.ok) throw new Error(`PM positions: ${res.status}`);
  return res.json();
}

export async function getPolymarketActivity(limit = 200): Promise<PolymarketActivity[]> {
  const res = await fetch(
    `${POLYMARKET_DATA_API}/activity?user=${wallet()}&limit=${limit}`,
    { next: { revalidate: 30 } }
  );
  if (!res.ok) throw new Error(`PM activity: ${res.status}`);
  return res.json();
}

export async function getPolymarketValue(): Promise<number> {
  const res = await fetch(`${POLYMARKET_DATA_API}/value?user=${wallet()}`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`PM value: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0]?.value ?? 0 : 0;
}

// --- Gamma API (weather markets) ---

function todaySlug(city: City): string {
  const now = new Date();
  const months = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];
  const month = months[now.getUTCMonth()];
  const day = now.getUTCDate();
  const year = now.getUTCFullYear();
  const slugCity = CITY_SERIES[city].slugCity;
  return `highest-temperature-in-${slugCity}-on-${month}-${day}-${year}`;
}

export async function getWeatherEvent(city: City): Promise<GammaEvent | null> {
  const slug = todaySlug(city);
  const res = await fetch(`${POLYMARKET_GAMMA_API}/events?slug=${slug}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) return data[0];
  return null;
}

export async function getWeatherMarketData(city: City): Promise<WeatherMarketData | null> {
  const event = await getWeatherEvent(city);
  if (!event) return null;

  const buckets: TempBucket[] = (event.markets || [])
    .filter((m) => m.active || !m.closed)
    .map((m) => {
      const prices = JSON.parse(m.outcomePrices || "[0,0]");
      return {
        label: m.groupItemTitle || m.question,
        marketId: m.id,
        conditionId: m.conditionId,
        yesPrice: parseFloat(prices[0]) || 0,
        noPrice: parseFloat(prices[1]) || 0,
        volume: m.volume || 0,
      };
    })
    .sort((a, b) => {
      const numA = parseFloat(a.label.replace(/[^\d.-]/g, "")) || 0;
      const numB = parseFloat(b.label.replace(/[^\d.-]/g, "")) || 0;
      return numA - numB;
    });

  return {
    city,
    eventSlug: event.slug,
    eventTitle: event.title,
    volume: event.volume || 0,
    endDate: event.endDate,
    buckets,
  };
}

// --- Aggregated data for dashboard ---

export async function getAllWeatherMarkets(): Promise<WeatherMarketData[]> {
  const cities: City[] = ["NYC", "Chicago", "Seattle", "Atlanta", "Dallas"];
  const results = await Promise.allSettled(cities.map((c) => getWeatherMarketData(c)));
  return results
    .filter((r): r is PromiseFulfilledResult<WeatherMarketData | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((d): d is WeatherMarketData => d !== null);
}

// --- VPS Server Data (real-time from bot) ---

export async function getVPSExecutions(): Promise<Execution[]> {
  const res = await fetch(`${VPS_DATA_URL}/executions.jsonl`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`VPS executions: ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split("\n").filter(Boolean);
  return lines.map((line) => JSON.parse(line) as Execution);
}

export async function getVPSPortfolio(): Promise<VPSPortfolio> {
  const res = await fetch(`${VPS_DATA_URL}/portfolio.json`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`VPS portfolio: ${res.status}`);
  return res.json();
}

export async function getVPSPositions(): Promise<VPSPositions> {
  const res = await fetch(`${VPS_DATA_URL}/positions.json`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`VPS positions: ${res.status}`);
  return res.json();
}

export async function getVPSTrades(): Promise<{ trades: VPSTrade[] }> {
  const res = await fetch(`${VPS_DATA_URL}/trades.json`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`VPS trades: ${res.status}`);
  return res.json();
}

export async function getVPSBriefing(): Promise<SimmerBriefing | null> {
  const res = await fetch(`${VPS_DATA_URL}/briefing.json`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getVPSDivergence(): Promise<DivergenceOpportunity[]> {
  const res = await fetch(`${VPS_DATA_URL}/divergence.json`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
