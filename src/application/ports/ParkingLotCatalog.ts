import type { ParkingLot, ParkingSpot } from "@/domain/parking/ParkingLot";

/** Справочник парковок и мест */
export interface ParkingLotCatalog {
  lots(): readonly ParkingLot[];
  defaultLotId(): string;
  findLot(id: string): ParkingLot | undefined;
  findSpot(id: string): ParkingSpot | undefined;
}
