export type OwnerId = "marcos" | "jorge" | "mario" | "jose";
export type EasterEggId = "going-crazy" | "monkey-brain";

export interface OwnerConfig {
  id: OwnerId;
  name: string;
  type: "US" | "Intl";
  cities: string[];
  color: string;
  accentDim: string;
  emoji: string;
  /** Path under /public — try .jpg first, fallback to .svg */
  avatar?: string;
  spotify?: { title: string; artist: string };
  easterEgg?: EasterEggId;
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
    spotify: { title: "Piel suya", artist: "Yung Nick" },
  },
  jorge: {
    id: "jorge",
    name: "Jorge",
    type: "US",
    cities: ["NYC", "Chicago", "Atlanta", "Dallas", "Miami"],
    color: "#60a5fa",
    accentDim: "rgba(96,165,250,0.12)",
    emoji: "⚡",
    avatar: "/avatars/jorge",
    spotify: { title: "Piel suya", artist: "Yung Nick" },
    easterEgg: "going-crazy",
  },
  mario: {
    id: "mario",
    name: "Mario",
    type: "Intl",
    cities: ["London", "Seoul", "Toronto", "Paris", "Tokyo", "Sydney"],
    color: "#ff79c6",
    accentDim: "rgba(255,121,198,0.12)",
    emoji: "🐒",
    avatar: "/avatars/mario",
    spotify: { title: "Piel suya", artist: "Yung Nick" },
    easterEgg: "monkey-brain",
  },
  jose: {
    id: "jose",
    name: "José",
    type: "Intl",
    cities: ["London", "Seoul", "Toronto", "Paris", "Tokyo", "Sydney"],
    color: "#ffb700",
    accentDim: "rgba(255,183,0,0.12)",
    emoji: "🌐",
    spotify: { title: "Piel suya", artist: "Yung Nick" },
  },
};

export const OWNER_IDS: OwnerId[] = ["marcos", "jorge", "mario", "jose"];
