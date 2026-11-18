/** Сущности парковки. Чистые данные, без зависимостей. */

export type Zone = string;
export type SpotType = "standard" | "ev" | "accessible" | "family";
export const SPOT_TYPES: readonly SpotType[] = ["standard", "ev", "accessible", "family"];

export interface ParkingSpot {
  id: string;
  /** Парковка, к которой относится место */
  lotId: string;
  code: string;
  zone: Zone;
  type: SpotType;
  /** Закрыто администрацией */
  closed: boolean;
  closedReason?: string | undefined;
  /** Центр места в координатах схемы (x, z), метры */
  position: [number, number];
  /** Ориентация: 1 — въезд со стороны +z, -1 — со стороны -z */
  facing: 1 | -1;
}

export interface ParkingRow {
  zone: Zone;
  /** Центр ряда по z */
  z: number;
  facing: 1 | -1;
  /** Ось проезда, с которого заезжают на места ряда */
  aisleZ: number;
}

export interface LotBuilding {
  /** Надпись на фасаде */
  sign: string;
  color: string;
  signColor: string;
  signText: string;
  /** Ширина, глубина, высота */
  size: [number, number, number];
  floors: number;
}

export interface ParkingLot {
  id: string;
  name: string;
  short: string;
  city: string;
  address: string;
  description: string;
  timezone: string;
  /** Тарифы ₸/час по типу места */
  rates: Record<SpotType, number>;
  hours: string;
  rows: ParkingRow[];
  /** Мест в ряду */
  cols: number;
  building: LotBuilding | null;
  accent: string;
  spots: ParkingSpot[];
}

/** Тариф места определяется парковкой и типом места */
export function rateFor(lot: ParkingLot, spot: ParkingSpot): number {
  return lot.rates[spot.type];
}
