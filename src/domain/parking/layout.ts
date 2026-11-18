import type { ParkingRow, ParkingSpot, SpotType } from "./ParkingLot";

/** Габариты машино-места, метры */
export const SPOT_W = 2.7;
export const SPOT_D = 5;

/**
 * Пары рядов «спиной к спине» с проездом между парами.
 * Ряд с facing=+1 открыт к проезду со стороны +z, facing=-1 — со стороны -z.
 */
export function pairedRows(zones: string[], aisle = 6): ParkingRow[] {
  const pitch = SPOT_D + aisle;
  const raw: { z: number; facing: 1 | -1; aisleZ: number }[] = [];
  let z = 0;
  zones.forEach((_, i) => {
    const facing: 1 | -1 = i % 2 === 0 ? 1 : -1;
    if (i > 0) z += i % 2 === 1 ? pitch : SPOT_D;
    raw.push({ z, facing, aisleZ: z + facing * (SPOT_D / 2 + aisle / 2) });
  });
  const mid = (raw[0]!.z + raw[raw.length - 1]!.z) / 2;
  return zones.map((zone, i) => {
    const r = raw[i]!;
    return { zone, z: r.z - mid, facing: r.facing, aisleZ: r.aisleZ - mid };
  });
}

export interface SpotLayoutInput {
  lotId: string;
  /** Префикс id мест (пустой — id совпадает с кодом) */
  idPrefix: string;
  rows: ParkingRow[];
  cols: number;
  types: Record<string, SpotType>;
  closed: Record<string, string>;
}

/** Места по сетке рядов: код вида A01, координаты центров */
export function buildSpots(cfg: SpotLayoutInput): ParkingSpot[] {
  const out: ParkingSpot[] = [];
  for (const row of cfg.rows) {
    for (let i = 1; i <= cfg.cols; i++) {
      const code = `${row.zone}${String(i).padStart(2, "0")}`;
      out.push({
        id: cfg.idPrefix ? `${cfg.idPrefix}-${code}` : code,
        lotId: cfg.lotId,
        code,
        zone: row.zone,
        type: cfg.types[code] ?? "standard",
        closed: code in cfg.closed,
        closedReason: cfg.closed[code],
        position: [(i - (cfg.cols + 1) / 2) * SPOT_W, row.z],
        facing: row.facing,
      });
    }
  }
  return out;
}
