export type Zone = string;
export type SpotType = "standard" | "ev" | "accessible" | "family";

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
  /** Центр места в координатах сцены (x, z) */
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
  /** Основной цвет фасада */
  color: string;
  /** Цвет вывески */
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
  /** Часы работы в формате для отображения */
  hours: string;
  rows: ParkingRow[];
  /** Мест в ряду */
  cols: number;
  building: LotBuilding | null;
  accent: string;
  spots: ParkingSpot[];
}

/** Жизненный цикл хранится; «предстоящее/активное» вычисляется по времени */
export type BookingLifecycle = "confirmed" | "cancelled" | "completed";

export interface Booking {
  id: string;
  spotId: string;
  ownerId: string | null;
  plate: string;
  /** UTC ms */
  startAt: number;
  /** UTC ms или null для бессрочного */
  plannedEndAt: number | null;
  actualEndAt: number | null;
  lifecycle: BookingLifecycle;
  /** Тариф ₸/час, зафиксированный при создании */
  hourlyRate: number;
  createdAt: number;
  finalCost: number | null;
  idempotencyKey: string;
}

export type BookingView = "upcoming" | "active" | "completed" | "cancelled";

export interface Period {
  start: number;
  end: number | null;
}

export type SpotAvailability =
  | { status: "available" }
  | { status: "unavailable"; reason: string }
  | { status: "closed"; reason: string };
