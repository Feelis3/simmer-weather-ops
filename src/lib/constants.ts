export const CITIES = ["NYC", "Chicago", "Seattle", "Atlanta", "Dallas"] as const;
export type City = (typeof CITIES)[number];

export const CITY_SERIES: Record<City, { seriesId: number; station: string; slugCity: string }> = {
  NYC: { seriesId: 10726, station: "KLGA (LaGuardia)", slugCity: "nyc" },
  Chicago: { seriesId: 10726, station: "KORD (O'Hare)", slugCity: "chicago" },
  Seattle: { seriesId: 10734, station: "KSEA (SeaTac)", slugCity: "seattle" },
  Atlanta: { seriesId: 10739, station: "KATL (Hartsfield)", slugCity: "atlanta" },
  Dallas: { seriesId: 10727, station: "Love Field", slugCity: "dallas" },
};

export const SIMMER_API = "https://api.simmer.markets";
export const POLYMARKET_DATA_API = "https://data-api.polymarket.com";
export const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";
export const POLYMARKET_CLOB_API = "https://clob.polymarket.com";
