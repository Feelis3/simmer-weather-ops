export const VPS_API = "http://194.163.160.76:8420";

export type BotId = "weather" | "eia" | "fred";

export const BOTS: Record<BotId, { label: string; emoji: string; color: string; desc: string }> = {
  weather: { label: "Weather", emoji: "\u{1F321}\uFE0F", color: "#03E78B", desc: "NOAA \u2192 temperature markets, every 2 min" },
  eia:     { label: "EIA Crude", emoji: "\u{1F6E2}\uFE0F", color: "#60a5fa", desc: "Wed 16:30 CET, crude oil inventories" },
  fred:    { label: "FRED Macro", emoji: "\u{1F4CA}", color: "#b48eff", desc: "M-F 15:30 CET, CPI/employment data" },
};

export const BOT_IDS: BotId[] = ["weather", "eia", "fred"];
