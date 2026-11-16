import type { SpotAvailability, SpotType, Zone } from "@/domain/types";

export type SpotDisplay = SpotAvailability & { dimmed: boolean };

export interface Filters {
  zone: Zone | "all";
  type: SpotType | "all";
  onlyAvailable: boolean;
}

export const DEFAULT_FILTERS: Filters = { zone: "all", type: "all", onlyAvailable: false };

export const STATUS_LABEL = {
  available: "Доступно",
  unavailable: "Недоступно в выбранное время",
  closed: "Закрыто",
  selected: "Выбрано",
} as const;
