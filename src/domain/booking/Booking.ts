/** Бронирование и связанные значения. Чистые данные, без зависимостей. */

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
  | { status: "unavailable"; conflict: Period }
  | { status: "closed"; reason: string | null };

export function isBooking(x: unknown): x is Booking {
  if (!x || typeof x !== "object") return false;
  const b = x as Partial<Record<keyof Booking, unknown>>;
  return (
    typeof b.id === "string" &&
    typeof b.spotId === "string" &&
    typeof b.plate === "string" &&
    typeof b.startAt === "number" &&
    (b.plannedEndAt === null || typeof b.plannedEndAt === "number") &&
    (b.actualEndAt === null || typeof b.actualEndAt === "number") &&
    (b.lifecycle === "confirmed" || b.lifecycle === "cancelled" || b.lifecycle === "completed") &&
    typeof b.hourlyRate === "number" &&
    typeof b.idempotencyKey === "string"
  );
}
