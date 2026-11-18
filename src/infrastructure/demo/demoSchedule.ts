import type { Booking } from "@/domain/booking/Booking";
import { rateFor } from "@/domain/parking/ParkingLot";
import { DAY, HOUR, MINUTE } from "@/domain/shared/time";
import type { ParkingLotCatalog } from "@/application/ports/ParkingLotCatalog";
import type { DemoDataSource, IdGenerator } from "@/application/ports/system";
import { DEMO_USER_ID } from "../system/system";

type Entry = [spotId: string, startOffset: number, duration: number | null, ownerId: string | null, plate: string];

const CENTRAL: Entry[] = [
  ["A03", -HOUR, 3 * HOUR, null, "SEED"],
  ["A07", -2 * HOUR, 5 * HOUR, null, "SEED"],
  ["B05", -30 * MINUTE, null, null, "SEED"],
  ["B08", 30 * MINUTE, 2 * HOUR, null, "SEED"],
  ["C03", -HOUR, 2 * HOUR, null, "SEED"],
  ["C09", 2 * HOUR, 4 * HOUR, null, "SEED"],
  ["B01", -15 * MINUTE, 90 * MINUTE, null, "SEED"],
  ["A10", DAY, 8 * HOUR, null, "SEED"],
  ["B10", 3 * HOUR, 2 * HOUR, DEMO_USER_ID, "777 ABC 17"],
];

const MALLS: Entry[] = [
  ["SP-A04", -HOUR, 3 * HOUR, null, "SEED"],
  ["SP-A10", -30 * MINUTE, 2 * HOUR, null, "SEED"],
  ["SP-B02", -2 * HOUR, 4 * HOUR, null, "SEED"],
  ["SP-B09", 45 * MINUTE, 2 * HOUR, null, "SEED"],
  ["SP-C03", -HOUR, null, null, "SEED"],
  ["SP-C12", -20 * MINUTE, HOUR, null, "SEED"],
  ["SP-D05", 2 * HOUR, 3 * HOUR, null, "SEED"],
  ["SP-D13", -40 * MINUTE, 2 * HOUR, null, "SEED"],
  ["MG-A03", -HOUR, 2 * HOUR, null, "SEED"],
  ["MG-A11", -10 * MINUTE, 3 * HOUR, null, "SEED"],
  ["MG-B04", -3 * HOUR, 5 * HOUR, null, "SEED"],
  ["MG-B07", -HOUR, 2 * HOUR, null, "SEED"],
  ["MG-C02", 30 * MINUTE, 2 * HOUR, null, "SEED"],
  ["MG-C13", -2 * HOUR, 6 * HOUR, null, "SEED"],
  ["MG-D06", -45 * MINUTE, 90 * MINUTE, null, "SEED"],
  ["MG-E03", -HOUR, null, null, "SEED"],
  ["MG-F02", -30 * MINUTE, 2 * HOUR, null, "SEED"],
  ["MG-F09", 4 * HOUR, 2 * HOUR, null, "SEED"],
];

/** Демонстрационное расписание относительно текущего времени */
export function createDemoSchedule(catalog: ParkingLotCatalog, ids: IdGenerator) {
  const make = (now: number, entries: Entry[]): Booking[] =>
    entries.map(([spotId, off, dur, ownerId, plate]) => {
      const start = Math.floor((now + off) / (5 * MINUTE)) * 5 * MINUTE;
      const spot = catalog.findSpot(spotId);
      const lot = spot && catalog.findLot(spot.lotId);
      return {
        id: ids.next(),
        spotId,
        ownerId,
        plate,
        startAt: start,
        plannedEndAt: dur === null ? null : start + dur,
        actualEndAt: null,
        lifecycle: "confirmed",
        hourlyRate: spot && lot ? rateFor(lot, spot) : 300,
        createdAt: now - DAY,
        finalCost: null,
        idempotencyKey: `seed-${spotId}-${off}`,
      };
    });
  const source: DemoDataSource & { mallBookings(now: number): Booking[] } = {
    bookings: (now) => [...make(now, CENTRAL), ...make(now, MALLS)],
    /** Для пользователей первой версии, у которых ещё нет расписания ТЦ */
    mallBookings: (now) => make(now, MALLS),
  };
  return source;
}
