import { MINUTE } from "../shared/time";

export const MIN_BILLABLE_MINUTES = 30;

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
