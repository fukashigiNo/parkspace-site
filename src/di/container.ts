/**
 * Composition root: единственное место, где слои соединяются.
 * Presentation получает готовый ParkingApp и не знает о localStorage, демо-данных и т. п.
 */
import { createParkingApp, type ParkingApp } from "@/application/ParkingApp";
import { createStaticCatalog } from "@/infrastructure/catalog/StaticParkingLotCatalog";
import { DEFAULT_LOT_ID, LOTS } from "@/infrastructure/catalog/lots";
import { createDemoSchedule } from "@/infrastructure/demo/demoSchedule";
import { browserStorage, createLocalStorageBookingRepository } from "@/infrastructure/persistence/LocalStorageBookingRepository";
import { cryptoIds, demoUser, systemClock } from "@/infrastructure/system/system";

export const catalog = createStaticCatalog(LOTS, DEFAULT_LOT_ID);

let app: ParkingApp | null = null;

export function getParkingApp(): ParkingApp {
  if (!app) {
    const demo = createDemoSchedule(catalog, cryptoIds);
    const bookings = createLocalStorageBookingRepository(browserStorage(), {
      all: () => demo.bookings(systemClock.now()),
      malls: () => demo.mallBookings(systemClock.now()),
    });
    app = createParkingApp({ bookings, catalog, clock: systemClock, ids: cryptoIds, user: demoUser, demo });
  }
  return app;
}
