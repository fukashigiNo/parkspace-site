import type { BookingRepository } from "./ports/BookingRepository";
import type { ParkingLotCatalog } from "./ports/ParkingLotCatalog";
import type { Clock, CurrentUser, DemoDataSource, IdGenerator } from "./ports/system";
import { makeCreateBooking } from "./use-cases/createBooking";
import { makeCancelBooking, makeCompleteBooking } from "./use-cases/manageBooking";
import { makeResetDemoData } from "./use-cases/resetDemoData";

export interface ParkingAppDeps {
  bookings: BookingRepository;
  catalog: ParkingLotCatalog;
  clock: Clock;
  ids: IdGenerator;
  user: CurrentUser;
  demo: DemoDataSource;
}

/** Фасад прикладного слоя: всё, что может делать интерфейс */
export function createParkingApp(deps: ParkingAppDeps) {
  return {
    catalog: deps.catalog,
    currentUserId: () => deps.user.id(),
    bookings: {
      list: () => deps.bookings.list(),
      subscribe: (cb: () => void) => deps.bookings.subscribe(cb),
    },
    createBooking: makeCreateBooking(deps),
    cancelBooking: makeCancelBooking(deps),
    completeBooking: makeCompleteBooking(deps),
    resetDemoData: makeResetDemoData(deps),
  };
}

export type ParkingApp = ReturnType<typeof createParkingApp>;
