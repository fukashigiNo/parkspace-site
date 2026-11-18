import type { ParkingLot } from "@/domain/parking/ParkingLot";
import { SPOT_D, SPOT_W } from "@/domain/parking/layout";

export { SPOT_D, SPOT_W };

/** Габариты площадки для 3D: блок мест, боковые полосы, внешняя граница */
export function lotBounds(lot: ParkingLot) {
  const bx = (lot.cols / 2) * SPOT_W + 1;
  const zs = lot.rows.flatMap((r) => [r.z - SPOT_D / 2, r.z + SPOT_D / 2, r.aisleZ]);
  const minZ = Math.min(...zs) - 1;
  const maxZ = Math.max(...zs) + 1;
  return { bx, minZ, maxZ, laneX: bx + 6, outerX: bx + 9, outerMinZ: minZ - 5, outerMaxZ: maxZ + 5 };
}
