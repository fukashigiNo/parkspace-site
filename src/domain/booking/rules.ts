import type { Booking, BookingView, Period, SpotAvailability } from "./Booking";
import type { ParkingSpot } from "../parking/ParkingLot";
import type { PeriodError, PlateError } from "./errors";
import { intervalsOverlap } from "../shared/interval";
import { calcCost } from "./pricing";
import { MINUTE } from "../shared/time";

export const MIN_DURATION_MS = 30 * MINUTE;
export const PLATE_MAX = 15;

/** Текущее представление брони по времени и жизненному циклу */
export function bookingView(b: Booking, now: number): BookingView {
  if (b.lifecycle === "cancelled") return "cancelled";
  if (b.lifecycle === "completed") return "completed";
  if (b.plannedEndAt !== null && now >= b.plannedEndAt) return "completed";
  if (now < b.startAt) return "upcoming";
  return "active";
}

/** Интервал, который бронь реально блокирует (null — ничего) */
export function blockingInterval(b: Booking): Period | null {
  if (b.lifecycle === "cancelled") return null;
  if (b.lifecycle === "completed") {
    const end = b.actualEndAt ?? b.plannedEndAt;
    if (end === null || end <= b.startAt) return null;
    return { start: b.startAt, end };
  }
  return { start: b.startAt, end: b.plannedEndAt };
}

/** Занимает ли бронь место в указанный момент */
export function occupiesAt(b: Booking, at: number): boolean {
  const iv = blockingInterval(b);
  return iv !== null && iv.start <= at && (iv.end === null || at < iv.end);
}

export function findConflict(spotId: string, period: Period, bookings: readonly Booking[]): Booking | undefined {
  return bookings.find((b) => {
    if (b.spotId !== spotId) return false;
    const iv = blockingInterval(b);
    return iv !== null && intervalsOverlap(iv.start, iv.end, period.start, period.end);
  });
}

export function spotAvailability(spot: ParkingSpot, period: Period | null, bookings: readonly Booking[]): SpotAvailability {
  if (spot.closed) return { status: "closed", reason: spot.closedReason ?? null };
  if (!period) return { status: "available" };
  const c = findConflict(spot.id, period, bookings);
  if (c) return { status: "unavailable", conflict: { start: c.startAt, end: c.plannedEndAt } };
  return { status: "available" };
}

export function validatePeriod(
  p: { start: number | null; end: number | null; openEnded: boolean },
  now: number,
): PeriodError | null {
  if (p.start === null) return "invalid";
  if (!p.openEnded && p.end === null) return "invalid";
  if (p.start < now) return "past";
  if (!p.openEnded && p.end !== null) {
    if (p.end <= p.start) return "endBeforeStart";
    if (p.end - p.start < MIN_DURATION_MS) return "tooShort";
  }
  return null;
}

/** Стоимость брони: итог, план или текущие начисления */
export function bookingCost(b: Booking, now: number): { amount: number; kind: "final" | "planned" | "accrued" | "minimum" } {
  if (b.finalCost !== null) return { amount: b.finalCost, kind: "final" };
  const view = bookingView(b, now);
  if (b.plannedEndAt !== null) {
    return { amount: calcCost(b.hourlyRate, b.plannedEndAt - b.startAt), kind: view === "completed" ? "final" : "planned" };
  }
  if (view === "upcoming") return { amount: calcCost(b.hourlyRate, 0), kind: "minimum" };
  return { amount: calcCost(b.hourlyRate, now - b.startAt), kind: "accrued" };
}

export function normalizePlate(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toUpperCase();
}

export function validatePlate(raw: string): PlateError | null {
  const v = normalizePlate(raw);
  if (!v) return "plateEmpty";
  if (v.length > PLATE_MAX) return "plateTooLong";
  if (!/^[0-9A-ZА-ЯЁӘҒҚҢӨҰҮҺІ\s-]+$/u.test(v)) return "plateChars";
  return null;
}

/** Досрочное завершение: фиксируем факт и считаем итог */
export function completeAt(b: Booking, now: number): Booking {
  return { ...b, lifecycle: "completed", actualEndAt: now, finalCost: calcCost(b.hourlyRate, now - b.startAt) };
}
