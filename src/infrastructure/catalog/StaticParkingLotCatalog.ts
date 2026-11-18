import type { ParkingLot, ParkingSpot } from "@/domain/parking/ParkingLot";
import type { ParkingLotCatalog } from "@/application/ports/ParkingLotCatalog";

/** Справочник парковок из статических данных */
export function createStaticCatalog(lots: readonly ParkingLot[], defaultId: string): ParkingLotCatalog {
  const lotIndex = new Map(lots.map((l) => [l.id, l] as const));
  const spotIndex = new Map<string, ParkingSpot>(lots.flatMap((l) => l.spots.map((s) => [s.id, s] as const)));
  return {
    lots: () => lots,
    defaultLotId: () => defaultId,
    findLot: (id) => lotIndex.get(id),
    findSpot: (id) => spotIndex.get(id),
  };
}
