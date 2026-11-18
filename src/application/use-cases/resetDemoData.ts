import type { BookingRepository } from "../ports/BookingRepository";
import type { Clock, DemoDataSource } from "../ports/system";

export function makeResetDemoData({ bookings, demo, clock }: { bookings: BookingRepository; demo: DemoDataSource; clock: Clock }) {
  return function resetDemoData(): void {
    bookings.replaceAll(demo.bookings(clock.now()));
  };
}
