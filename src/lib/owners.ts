export type OwnerId = "marcos" | "jorge" | "mario" | "jose";

export interface OwnerConfig {
  id: OwnerId;
  name: string;
  type: "US" | "Intl";
  cities: string[];
  color: string;
  accentDim: string;
  emoji: string;
}

export const OWNERS: Record<OwnerId, OwnerConfig> = {
  marcos: {
    id: "marcos",
    name: "Marcos",
    type: "US",
    cities: ["NYC", "Chicago", "Atlanta", "Dallas", "Miami"],
    color: "#03E78B",
    accentDim: "rgba(3,231,139,0.12)",
    emoji: "🌡️",
  },
  jorge: {
    id: "jorge",
    name: "Jorge",
    type: "US",
    cities: ["NYC", "Chicago", "Atlanta", "Dallas", "Miami"],
    color: "#60a5fa",
    accentDim: "rgba(96,165,250,0.12)",
    emoji: "⚡",
  },
  mario: {
    id: "mario",
    name: "Mario",
    type: "Intl",
    cities: ["London", "Seoul", "Toronto", "Paris", "Tokyo", "Sydney"],
    color: "#ff79c6",
    accentDim: "rgba(255,121,198,0.12)",
    emoji: "🐒",
  },
  jose: {
    id: "jose",
    name: "José",
    type: "Intl",
    cities: ["London", "Seoul", "Toronto", "Paris", "Tokyo", "Sydney"],
    color: "#ffb700",
    accentDim: "rgba(255,183,0,0.12)",
    emoji: "🌐",
  },
};

export const OWNER_IDS: OwnerId[] = ["marcos", "jorge", "mario", "jose"];
