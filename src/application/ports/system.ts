import type { Booking } from "@/domain/booking/Booking";

/** Источник текущего времени (UTC ms) */
export interface Clock {
  now(): number;
}

export interface IdGenerator {
  next(): string;
}

/** Кто сейчас пользуется приложением */
export interface CurrentUser {
  id(): string;
}

/** Демонстрационное расписание для сброса данных */
export interface DemoDataSource {
  bookings(now: number): readonly Booking[];
}
