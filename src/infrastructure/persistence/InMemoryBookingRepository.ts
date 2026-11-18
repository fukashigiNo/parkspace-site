import type { Booking } from "@/domain/booking/Booking";
import type { BookingRepository } from "@/application/ports/BookingRepository";

/** Хранилище в памяти. Используется в тестах и как основа для localStorage. */
export function createInMemoryBookingRepository(
  initial: readonly Booking[] = [],
  onChange?: (bookings: readonly Booking[]) => void,
): BookingRepository {
  let cache: readonly Booking[] = initial;
  const subs = new Set<() => void>();
  const commit = (next: readonly Booking[]) => {
    cache = next;
    onChange?.(cache);
    subs.forEach((s) => s());
  };
  return {
    list: () => cache,
    findById: (id) => cache.find((b) => b.id === id),
    findByIdempotencyKey: (key) => cache.find((b) => b.idempotencyKey === key),
    add: (b) => commit([...cache, b]),
    update: (b) => commit(cache.map((x) => (x.id === b.id ? b : x))),
    replaceAll: (bs) => commit([...bs]),
    subscribe(cb) {
      subs.add(cb);
      return () => void subs.delete(cb);
    },
  };
}
