import type { Booking } from "@/domain/booking/Booking";

/** Хранилище бронирований. Только сохранение — без бизнес-правил. */
export interface BookingRepository {
  list(): readonly Booking[];
  findById(id: string): Booking | undefined;
  findByIdempotencyKey(key: string): Booking | undefined;
  add(booking: Booking): void;
  update(booking: Booking): void;
  replaceAll(bookings: readonly Booking[]): void;
  /** Подписка на изменения; возвращает функцию отписки */
  subscribe(listener: () => void): () => void;
}
