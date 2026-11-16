import type { SpotType } from "./types";
import { MINUTE } from "./time";

export const MIN_BILLABLE_MINUTES = 30;

/** Демонстрационные тарифы, ₸/час */
export const DEMO_RATES: Record<SpotType, number> = {
  standard: 300,
  ev: 400,
  accessible: 300,
  family: 300,
};

export function billableMinutes(durationMs: number): number {
  return Math.max(MIN_BILLABLE_MINUTES, Math.ceil(Math.max(0, durationMs) / MINUTE));
}

/** Округление до тенге один раз в конце */
export function calcCost(hourlyRate: number, durationMs: number): number {
  return Math.round((hourlyRate * billableMinutes(durationMs)) / 60);
}

export function minimumCost(hourlyRate: number): number {
  return calcCost(hourlyRate, 0);
}

export function formatTenge(n: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(n)} ₸`;
}
