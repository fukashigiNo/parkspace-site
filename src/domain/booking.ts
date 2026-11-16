import type { Booking, BookingView, ParkingSpot, Period, SpotAvailability } from "./types";
import { intervalsOverlap } from "./interval";
import { calcCost } from "./pricing";
import { MINUTE, formatDateTime } from "./time";

export const MIN_DURATION_MS = 30 * MINUTE;

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

export function findConflict(
  spotId: string,
  period: Period,
  bookings: readonly Booking[],
): Booking | undefined {
  return bookings.find((b) => {
    if (b.spotId !== spotId) return false;
    const iv = blockingInterval(b);
    return iv !== null && intervalsOverlap(iv.start, iv.end, period.start, period.end);
  });
}

export function spotAvailability(
  spot: ParkingSpot,
  period: Period | null,
  bookings: readonly Booking[],
): SpotAvailability {
  if (spot.closed)
    return { status: "closed", reason: spot.closedReason ?? "Место закрыто администрацией" };
  if (!period) return { status: "available" };
  const c = findConflict(spot.id, period, bookings);
  if (c) {
    const until = c.plannedEndAt === null ? "без даты окончания" : `до ${formatDateTime(c.plannedEndAt)}`;
    return {
      status: "unavailable",
      reason: `Забронировано с ${formatDateTime(c.startAt)} ${until}`,
    };
  }
  return { status: "available" };
}

export type PeriodError =
  | "invalid"
  | "past"
  | "endBeforeStart"
  | "tooShort";

export const PERIOD_ERROR_TEXT: Record<PeriodError, string> = {
  invalid: "Укажите корректные дату и время",
  past: "Начало не может быть в прошлом",
  endBeforeStart: "Окончание должно быть позже начала",
  tooShort: "Минимальная длительность — 30 минут",
};

export function validatePeriod(p: { start: number | null; end: number | null; openEnded: boolean }, now: number): PeriodError | null {
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

export const PLATE_MAX = 15;

export function validatePlate(raw: string): string | null {
  const v = normalizePlate(raw);
  if (!v) return "Укажите госномер автомобиля";
  if (v.length > PLATE_MAX) return `Госномер не длиннее ${PLATE_MAX} символов`;
  if (!/^[0-9A-ZА-ЯЁӘҒҚҢӨҰҮҺІ\s-]+$/u.test(v)) return "Используйте буквы, цифры, пробел или дефис";
  return null;
}
