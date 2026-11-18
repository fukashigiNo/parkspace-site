import type { Booking } from "@/domain/booking/Booking";
import type { BookingError } from "@/domain/booking/errors";
import { rateFor } from "@/domain/parking/ParkingLot";
import { findConflict, normalizePlate, validatePeriod, validatePlate } from "@/domain/booking/rules";
import { fail, ok, type Result } from "@/domain/shared/result";
import type { BookingRepository } from "../ports/BookingRepository";
import type { ParkingLotCatalog } from "../ports/ParkingLotCatalog";
import type { Clock, CurrentUser, IdGenerator } from "../ports/system";

export interface CreateBookingInput {
  spotId: string;
  plate: string;
  start: number;
  end: number | null;
  /** Повторная отправка с тем же ключом вернёт ту же бронь */
  idempotencyKey: string;
}

export interface CreateBookingDeps {
  bookings: BookingRepository;
  catalog: ParkingLotCatalog;
  clock: Clock;
  ids: IdGenerator;
  user: CurrentUser;
}

export function makeCreateBooking({ bookings, catalog, clock, ids, user }: CreateBookingDeps) {
  return function createBooking(input: CreateBookingInput): Result<Booking, BookingError> {
    const existing = bookings.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return ok(existing);

    const now = clock.now();
    const spot = catalog.findSpot(input.spotId);
    const lot = spot && catalog.findLot(spot.lotId);
    if (!spot || !lot) return fail("spotNotFound");
    if (spot.closed) return fail("spotClosed");

    const periodErr = validatePeriod({ start: input.start, end: input.end, openEnded: input.end === null }, now);
    if (periodErr) return fail(periodErr);
    const plateErr = validatePlate(input.plate);
    if (plateErr) return fail(plateErr);
    if (findConflict(spot.id, { start: input.start, end: input.end }, bookings.list())) return fail("conflict");

    const booking: Booking = {
      id: ids.next(),
      spotId: spot.id,
      ownerId: user.id(),
      plate: normalizePlate(input.plate),
      startAt: input.start,
      plannedEndAt: input.end,
      actualEndAt: null,
      lifecycle: "confirmed",
      hourlyRate: rateFor(lot, spot),
      createdAt: now,
      finalCost: null,
      idempotencyKey: input.idempotencyKey,
    };
    bookings.add(booking);
    return ok(booking);
  };
}
