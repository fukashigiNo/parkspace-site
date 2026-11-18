import type { Booking } from "@/domain/booking/Booking";
import type { BookingError } from "@/domain/booking/errors";
import { bookingView, completeAt } from "@/domain/booking/rules";
import { fail, ok, type Result } from "@/domain/shared/result";
import type { BookingRepository } from "../ports/BookingRepository";
import type { Clock, CurrentUser } from "../ports/system";

interface Deps {
  bookings: BookingRepository;
  clock: Clock;
  user: CurrentUser;
}

function ownBooking({ bookings, user }: Deps, id: string): Result<Booking, BookingError> {
  const b = bookings.findById(id);
  if (!b) return fail("bookingNotFound");
  if (b.ownerId !== user.id()) return fail("notOwner");
  return ok(b);
}

/** Отмена возможна только до начала */
export function makeCancelBooking(deps: Deps) {
  return function cancelBooking(id: string): Result<Booking, BookingError> {
    const found = ownBooking(deps, id);
    if (!found.ok) return found;
    if (bookingView(found.value, deps.clock.now()) !== "upcoming") return fail("cancelOnlyUpcoming");
    const next: Booking = { ...found.value, lifecycle: "cancelled" };
    deps.bookings.update(next);
    return ok(next);
  };
}

/** Досрочное завершение активной парковки: остаток периода освобождается */
export function makeCompleteBooking(deps: Deps) {
  return function completeBooking(id: string): Result<Booking, BookingError> {
    const found = ownBooking(deps, id);
    if (!found.ok) return found;
    const now = deps.clock.now();
    if (bookingView(found.value, now) !== "active") return fail("completeOnlyActive");
    const next = completeAt(found.value, now);
    deps.bookings.update(next);
    return ok(next);
  };
}
