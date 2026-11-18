import type { ParkingLot, SpotType } from "@/domain/parking/ParkingLot";
import { buildSpots, pairedRows } from "@/domain/parking/layout";
import { LOT_TZ } from "@/domain/shared/time";

/**
 * Данные парковок (демо). Источник можно заменить на API —
 * остальное приложение видит только порт ParkingLotCatalog.
 */
interface LotConfig extends Omit<ParkingLot, "spots"> {
  /** Префикс id мест (пустой — id совпадает с кодом, как в первой версии) */
  idPrefix: string;
  types: Record<string, SpotType>;
  closed: Record<string, string>;
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
  const { idPrefix, types, closed, ...lot } = cfg;
  return { ...lot, spots: buildSpots({ lotId: cfg.id, idPrefix, rows: cfg.rows, cols: cfg.cols, types, closed }) };
}

export const LOTS: readonly ParkingLot[] = [build(PLAZA), build(MEGA), build(CENTRAL)];
export const DEFAULT_LOT_ID = "shymkent-plaza";
