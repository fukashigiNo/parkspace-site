import { isBooking, type Booking } from "@/domain/booking/Booking";
import type { BookingRepository } from "@/application/ports/BookingRepository";
import { createInMemoryBookingRepository } from "./InMemoryBookingRepository";

export const STORAGE_KEYS = {
  bookings: "parkspace.bookings.v1",
  seeded: "parkspace.seeded.v1",
  /** Демо-расписание для парковок ТЦ, добавленных позже */
  seededMalls: "parkspace.seeded.malls.v1",
} as const;

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

interface Seeds {
  /** Полное демо-расписание для первого запуска */
  all(): readonly Booking[];
  /** Расписание ТЦ для тех, кто пришёл с первой версии */
  malls(): readonly Booking[];
}

/** Брони в localStorage браузера (демо-режим без сервера) */
export function createLocalStorageBookingRepository(storage: StorageLike | null, seeds: Seeds): BookingRepository {
  const safeSet = (k: string, v: string) => {
    try {
      storage?.setItem(k, v);
    } catch {
      /* хранилище недоступно — работаем в памяти */
    }
  };
  const persist = (bs: readonly Booking[]) => {
    safeSet(STORAGE_KEYS.bookings, JSON.stringify(bs));
    safeSet(STORAGE_KEYS.seeded, "1");
    safeSet(STORAGE_KEYS.seededMalls, "1");
  };

  let initial: readonly Booking[] = [];
  let needsPersist = false;
  if (storage) {
    try {
      if (!storage.getItem(STORAGE_KEYS.seeded)) {
        initial = seeds.all();
        needsPersist = true;
      } else {
        const raw = storage.getItem(STORAGE_KEYS.bookings);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        initial = Array.isArray(parsed) ? parsed.filter(isBooking) : [];
        if (!storage.getItem(STORAGE_KEYS.seededMalls)) {
          initial = [...initial, ...seeds.malls()];
          needsPersist = true;
        }
      }
    } catch {
      initial = [];
    }
  }
  if (needsPersist) persist(initial);
  return createInMemoryBookingRepository(initial, persist);
}

export function browserStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}
