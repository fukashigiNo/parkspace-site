import type { Booking, BookingView, Period, SpotAvailability } from "@/domain/booking/Booking";
import type { ParkingLot, SpotType, Zone } from "@/domain/parking/ParkingLot";
import { bookingView, occupiesAt, spotAvailability } from "@/domain/booking/rules";

export interface SpotFilters {
  zone: Zone | "all";
  type: SpotType | "all";
  onlyAvailable: boolean;
}

export const DEFAULT_FILTERS: SpotFilters = { zone: "all", type: "all", onlyAvailable: false };

export type SpotStatus = SpotAvailability & { matchesFilters: boolean };

/** Статус каждого места парковки на период с учётом фильтров */
export function spotStatuses(
  lot: ParkingLot,
  period: Period | null,
  bookings: readonly Booking[],
  filters: SpotFilters,
): Record<string, SpotStatus> {
  const out: Record<string, SpotStatus> = {};
  for (const s of lot.spots) {
    const a = spotAvailability(s, period, bookings);
    const matchesFilters =
      (filters.zone === "all" || s.zone === filters.zone) &&
      (filters.type === "all" || s.type === filters.type) &&
      (!filters.onlyAvailable || a.status === "available");
    out[s.id] = { ...a, matchesFilters };
  }
  return out;
}

/** Кто стоит на месте в указанный момент: spotId → госномер */
export function occupancyAt(bookings: readonly Booking[], at: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const b of bookings) if (occupiesAt(b, at)) out[b.spotId] = b.plate;
  return out;
}

export interface LotStats {
  freeNow: number;
  total: number;
}

export function lotStats(lots: readonly ParkingLot[], occupancy: Record<string, string>): Record<string, LotStats> {
  const out: Record<string, LotStats> = {};
  for (const l of lots) {
    const free = l.spots.filter((s) => !s.closed && !occupancy[s.id]).length;
    out[l.id] = { total: l.spots.length, freeNow: free };
  }
  return out;
}

/** Брони пользователя, сгруппированные по состоянию, новые сверху */
export function myBookingsByView(bookings: readonly Booking[], userId: string, now: number): Record<BookingView, Booking[]> {
  const out: Record<BookingView, Booking[]> = { upcoming: [], active: [], completed: [], cancelled: [] };
  const mine = bookings.filter((b) => b.ownerId === userId).sort((a, b) => b.startAt - a.startAt);
  for (const b of mine) out[bookingView(b, now)].push(b);
  return out;
}
