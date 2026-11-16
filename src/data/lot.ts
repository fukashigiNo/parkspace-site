import type { ParkingLot, ParkingRow, ParkingSpot, SpotType } from "@/domain/types";
import { LOT_TZ } from "@/domain/time";

export const SPOT_W = 2.7;
export const SPOT_D = 5;

interface LotConfig extends Omit<ParkingLot, "spots"> {
  /** Префикс id мест (пустой — id совпадает с кодом, как в первой версии) */
  idPrefix: string;
  types: Record<string, SpotType>;
  closed: Record<string, string>;
}

function makeSpots(cfg: LotConfig): ParkingSpot[] {
  const out: ParkingSpot[] = [];
  for (const row of cfg.rows) {
    for (let i = 1; i <= cfg.cols; i++) {
      const code = `${row.zone}${String(i).padStart(2, "0")}`;
      out.push({
        id: cfg.idPrefix ? `${cfg.idPrefix}-${code}` : code,
        lotId: cfg.id,
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

/**
 * Пара рядов «спиной к спине» с проездом между парами.
 * Ряд с facing=+1 открыт к проезду со стороны +z, facing=-1 — со стороны -z.
 */
function pairedRows(zones: string[], aisle = 6): ParkingRow[] {
  const rows: ParkingRow[] = [];
  const pitch = SPOT_D + aisle; // от ряда до ряда через проезд
  // считаем позиции, затем центрируем
  const raw: { z: number; facing: 1 | -1; aisleZ: number }[] = [];
  let z = 0;
  zones.forEach((_, i) => {
    const facing: 1 | -1 = i % 2 === 0 ? 1 : -1;
    if (i > 0) z += i % 2 === 1 ? pitch : SPOT_D;
    const aisleZ = z + facing * (SPOT_D / 2 + aisle / 2);
    raw.push({ z, facing, aisleZ });
  });
  const mid = (raw[0]!.z + raw[raw.length - 1]!.z) / 2;
  zones.forEach((zone, i) => {
    const r = raw[i]!;
    rows.push({ zone, z: r.z - mid, facing: r.facing, aisleZ: r.aisleZ - mid });
  });
  return rows;
}

const CENTRAL: LotConfig = {
  id: "central",
  idPrefix: "",
  name: "Центральная парковка",
  short: "Центральная",
  city: "Шымкент",
  address: "Открытая городская парковка",
  description: "Небольшая открытая площадка в центре города, 36 мест.",
  timezone: LOT_TZ,
  hours: "Круглосуточно",
  rates: { standard: 300, ev: 400, accessible: 300, family: 300 },
  cols: 12,
  rows: [
    { zone: "A", z: -10, facing: 1, aisleZ: -5 },
    { zone: "B", z: 0, facing: 1, aisleZ: 5 },
    { zone: "C", z: 10, facing: -1, aisleZ: 5 },
  ],
  building: null,
  accent: "#2563eb",
  types: { A01: "accessible", A02: "accessible", B01: "ev", B02: "ev", B03: "ev", C11: "ev", C12: "ev", C01: "accessible" },
  closed: {
    A12: "Закрыто администрацией: ремонт разметки",
    C06: "Закрыто администрацией: техническое обслуживание",
  },
};

const PLAZA: LotConfig = {
  id: "shymkent-plaza",
  idPrefix: "SP",
  name: "ТРЦ Shymkent Plaza",
  short: "Shymkent Plaza",
  city: "Шымкент",
  address: "пл. Аль-Фараби, 3/1",
  description: "Наземная парковка у главного входа торгового центра, 56 мест. Семейные места — ближе всего к входу.",
  timezone: LOT_TZ,
  hours: "10:00–22:00",
  rates: { standard: 250, ev: 350, accessible: 0, family: 250 },
  cols: 14,
  rows: pairedRows(["A", "B", "C", "D"]),
  building: {
    sign: "SHYMKENT PLAZA",
    color: "#cfd8e3",
    signColor: "#0f3d75",
    signText: "#ffffff",
    size: [46, 16, 13],
    floors: 3,
  },
  accent: "#0f3d75",
  types: {
    A01: "accessible", A02: "accessible", A03: "accessible",
    A06: "family", A07: "family", A08: "family", A09: "family",
    A13: "ev", A14: "ev", D13: "ev", D14: "ev",
  },
  closed: { C07: "Закрыто администрацией: зона погрузки арендаторов" },
};

const MEGA: LotConfig = {
  id: "mega-center",
  idPrefix: "MG",
  name: "ТРЦ MEGA Center (Mega Planet)",
  short: "MEGA Center",
  city: "Шымкент",
  address: "пр. Тауке хана, угол бул. Кунаева",
  description: "Большая парковка перед торговым центром, 84 места в шести зонах, зарядные станции в зоне F.",
  timezone: LOT_TZ,
  hours: "10:00–23:00",
  rates: { standard: 200, ev: 300, accessible: 0, family: 200 },
  cols: 14,
  rows: pairedRows(["A", "B", "C", "D", "E", "F"]),
  building: {
    sign: "MEGA",
    color: "#e9e4dc",
    signColor: "#d32f2f",
    signText: "#ffffff",
    size: [58, 18, 15],
    floors: 2,
  },
  accent: "#d32f2f",
  types: {
    A01: "accessible", A02: "accessible", A14: "accessible",
    A05: "family", A06: "family", A07: "family", A08: "family", A09: "family", A10: "family",
    F01: "ev", F02: "ev", F03: "ev", F04: "ev", F05: "ev", F06: "ev",
  },
  closed: {
    E10: "Закрыто администрацией: ремонт покрытия",
    E11: "Закрыто администрацией: ремонт покрытия",
  },
};

function build(cfg: LotConfig): ParkingLot {
  const { idPrefix: _p, types: _t, closed: _c, ...lot } = cfg;
  return { ...lot, spots: makeSpots(cfg) };
}

export const LOTS: ParkingLot[] = [build(PLAZA), build(MEGA), build(CENTRAL)];
export const DEFAULT_LOT_ID = "shymkent-plaza";

/** Совместимость: первая (центральная) парковка */
export const DEMO_LOT: ParkingLot = LOTS.find((l) => l.id === "central")!;

const SPOT_INDEX = new Map<string, ParkingSpot>(LOTS.flatMap((l) => l.spots.map((s) => [s.id, s] as const)));

export const getLot = (id: string): ParkingLot => LOTS.find((l) => l.id === id) ?? LOTS[0]!;
export const getSpot = (id: string) => SPOT_INDEX.get(id);
export const lotOfSpot = (spot: ParkingSpot) => getLot(spot.lotId);
export const rateFor = (spot: ParkingSpot) => lotOfSpot(spot).rates[spot.type];

export const SPOT_TYPE_LABEL: Record<SpotType, string> = {
  standard: "Стандартное",
  ev: "Для электромобиля",
  accessible: "Для маломобильных водителей",
  family: "Семейное (с детьми)",
};

/** Ряд, к которому относится место */
export function rowOf(spot: ParkingSpot): ParkingRow {
  return lotOfSpot(spot).rows.find((r) => r.zone === spot.zone)!;
}

/** Габариты площадки: полуширина блока мест и полуглубина */
export function lotBounds(lot: ParkingLot) {
  const bx = (lot.cols / 2) * SPOT_W + 1;
  const zs = lot.rows.flatMap((r) => [r.z - SPOT_D / 2, r.z + SPOT_D / 2, r.aisleZ]);
  const minZ = Math.min(...zs) - 1;
  const maxZ = Math.max(...zs) + 1;
  return { bx, minZ, maxZ, laneX: bx + 6, outerX: bx + 9, outerMinZ: minZ - 5, outerMaxZ: maxZ + 5 };
}
