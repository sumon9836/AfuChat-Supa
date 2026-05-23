import type { ModuleManifest } from "./types";

export const SUPER_APP_REGISTRY: ModuleManifest[] = [
  {
    id: "afuai",
    name: "AfuAI",
    description: "Your intelligent AI assistant. Ask anything, do everything.",
    version: "1.0.0",
    icon: "sparkles",
    gradient: ["#00BCD4", "#0097A7"] as const,
    keepAlive: true,
    badge: "AI",
  },
  {
    id: "afupay",
    name: "AfuPay",
    description: "Send, receive and manage your ACoins & Nexa.",
    version: "1.0.0",
    icon: "wallet",
    gradient: ["#34C759", "#00C781"] as const,
    keepAlive: true,
  },
  {
    id: "afumarket",
    name: "AfuMarket",
    description: "Shop from verified stores and sellers.",
    version: "1.0.0",
    icon: "storefront",
    gradient: ["#AF52DE", "#BF5AF2"] as const,
    keepAlive: false,
    badge: "NEW",
  },
  {
    id: "afuchannel",
    name: "AfuChannel",
    description: "Discover and follow broadcast channels.",
    version: "1.0.0",
    icon: "radio",
    gradient: ["#FF9500", "#FF6B00"] as const,
    keepAlive: true,
  },
  {
    id: "afugames",
    name: "AfuGames",
    description: "Play games and compete with friends.",
    version: "1.0.0",
    icon: "game-controller",
    gradient: ["#FF3B30", "#FF6B35"] as const,
    keepAlive: false,
    badge: "SOON",
    comingSoon: true,
  },
  {
    id: "afumusic",
    name: "AfuMusic",
    description: "Stream music and podcasts.",
    version: "1.0.0",
    icon: "musical-notes",
    gradient: ["#5856D6", "#7B79E8"] as const,
    keepAlive: true,
    badge: "BETA",
  },
  {
    id: "afubusiness",
    name: "AfuBusiness",
    description: "Tools and analytics for your business.",
    version: "1.0.0",
    icon: "briefcase",
    gradient: ["#1C1C1E", "#3A3A3C"] as const,
    keepAlive: false,
  },
];

export const SUPER_APP_ID_SET = new Set(SUPER_APP_REGISTRY.map((m) => m.id));

export function findModule(id: string): ModuleManifest | undefined {
  return SUPER_APP_REGISTRY.find((m) => m.id === id);
}
