import type { Booking } from "@/domain/types";
import { findConflict, validatePeriod, validatePlate, normalizePlate, PERIOD_ERROR_TEXT, bookingView } from "@/domain/booking";
import { calcCost } from "@/domain/pricing";
import { DEMO_LOT, getSpot, rateFor } from "./lot";
import { HOUR, DAY, MINUTE } from "@/domain/time";

export const ME = "demo-user";
const KEY = "parkspace.bookings.v1";
const SEEDED_KEY = "parkspace.seeded.v1";
/** Демо-расписание для парковок ТЦ, добавленных позже */
const SEEDED_MALLS_KEY = "parkspace.seeded.malls.v1";

export interface CreateBookingInput {
  spotId: string;
  plate: string;
  start: number;
  end: number | null;
  idempotencyKey: string;
}

export type RepoResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface BookingRepository {
  list(): readonly Booking[];
  subscribe(cb: () => void): () => void;
  create(input: CreateBookingInput): RepoResult<Booking>;
  cancel(id: string): RepoResult<Booking>;
  complete(id: string): RepoResult<Booking>;
  reset(): void;
}

interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function isBooking(x: unknown): x is Booking {
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

let counter = 0;
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `b-${Date.now()}-${++counter}`;

function seedMaker(now: number) {
  return (spotId: string, startOff: number, dur: number | null, ownerId: string | null, plate: string): Booking => {
    const start = Math.floor((now + startOff) / (5 * MINUTE)) * 5 * MINUTE;
    return {
      id: newId(),
      spotId,
      ownerId,
      plate,
      startAt: start,
      plannedEndAt: dur === null ? null : start + dur,
      actualEndAt: null,
      lifecycle: "confirmed",
      hourlyRate: (() => {
        const sp = getSpot(spotId);
        return sp ? rateFor(sp) : 300;
      })(),
      createdAt: now - DAY,
      finalCost: null,
      idempotencyKey: `seed-${spotId}-${startOff}`,
    };
  };
}

export function seedMallBookings(now: number): Booking[] {
  const mk = seedMaker(now);
  return [
    mk("SP-A04", -HOUR, 3 * HOUR, null, "SEED"),
    mk("SP-A10", -30 * MINUTE, 2 * HOUR, null, "SEED"),
    mk("SP-B02", -2 * HOUR, 4 * HOUR, null, "SEED"),
    mk("SP-B09", 45 * MINUTE, 2 * HOUR, null, "SEED"),
    mk("SP-C03", -HOUR, null, null, "SEED"),
    mk("SP-C12", -20 * MINUTE, HOUR, null, "SEED"),
    mk("SP-D05", 2 * HOUR, 3 * HOUR, null, "SEED"),
    mk("SP-D13", -40 * MINUTE, 2 * HOUR, null, "SEED"),
    mk("MG-A03", -HOUR, 2 * HOUR, null, "SEED"),
    mk("MG-A11", -10 * MINUTE, 3 * HOUR, null, "SEED"),
    mk("MG-B04", -3 * HOUR, 5 * HOUR, null, "SEED"),
    mk("MG-B07", -HOUR, 2 * HOUR, null, "SEED"),
    mk("MG-C02", 30 * MINUTE, 2 * HOUR, null, "SEED"),
    mk("MG-C13", -2 * HOUR, 6 * HOUR, null, "SEED"),
    mk("MG-D06", -45 * MINUTE, 90 * MINUTE, null, "SEED"),
    mk("MG-E03", -HOUR, null, null, "SEED"),
    mk("MG-F02", -30 * MINUTE, 2 * HOUR, null, "SEED"),
    mk("MG-F09", 4 * HOUR, 2 * HOUR, null, "SEED"),
  ];
}

export function seedBookings(now: number): Booking[] {
  const mk = seedMaker(now);
  return [
    mk("A03", -HOUR, 3 * HOUR, null, "SEED"),
    mk("A07", -2 * HOUR, 5 * HOUR, null, "SEED"),
    mk("B05", -30 * MINUTE, null, null, "SEED"),
    mk("B08", 30 * MINUTE, 2 * HOUR, null, "SEED"),
    mk("C03", -HOUR, 2 * HOUR, null, "SEED"),
    mk("C09", 2 * HOUR, 4 * HOUR, null, "SEED"),
    mk("B01", -15 * MINUTE, 90 * MINUTE, null, "SEED"),
    mk("A10", DAY, 8 * HOUR, null, "SEED"),
    mk("B10", 3 * HOUR, 2 * HOUR, ME, "777 ABC 17"),
    ...seedMallBookings(now),
  ];
}

export function createLocalRepository(
  storage: StorageLike | null,
  clock: () => number = Date.now,
): BookingRepository {
  let cache: Booking[] = [];
  const subs = new Set<() => void>();

  const load = () => {
    if (!storage) return;
    try {
      if (!storage.getItem(SEEDED_KEY)) {
        cache = seedBookings(clock());
        storage.setItem(SEEDED_KEY, "1");
        storage.setItem(SEEDED_MALLS_KEY, "1");
        persist();
        return;
      }
      const raw = storage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      cache = Array.isArray(parsed) ? parsed.filter(isBooking) : [];
      if (!storage.getItem(SEEDED_MALLS_KEY)) {
        // Пользователи первой версии: добавляем расписание ТЦ, не трогая их брони
        cache = [...cache, ...seedMallBookings(clock())];
        storage.setItem(SEEDED_MALLS_KEY, "1");
        persist();
      }
    } catch {
      cache = [];
    }
  };
  const persist = () => {
    try {
      storage?.setItem(KEY, JSON.stringify(cache));
    } catch {
      /* хранилище недоступно — работаем в памяти */
    }
  };
  const commit = (next: Booking[]) => {
    cache = next;
    persist();
    subs.forEach((s) => s());
  };
  load();

  const update = (id: string, fn: (b: Booking) => RepoResult<Booking>): RepoResult<Booking> => {
    const b = cache.find((x) => x.id === id);
    if (!b) return { ok: false, error: "Бронирование не найдено" };
    if (b.ownerId !== ME) return { ok: false, error: "Это бронирование принадлежит другому водителю" };
    const r = fn(b);
    if (r.ok) commit(cache.map((x) => (x.id === id ? r.value : x)));
    return r;
  };

  return {
    list: () => cache,
    subscribe(cb) {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    create(input) {
      const existing = cache.find((b) => b.idempotencyKey === input.idempotencyKey);
      if (existing) return { ok: true, value: existing };
      const now = clock();
      const spot = getSpot(input.spotId);
      if (!spot) return { ok: false, error: "Место не найдено" };
      if (spot.closed) return { ok: false, error: spot.closedReason ?? "Место закрыто" };
      const pErr = validatePeriod({ start: input.start, end: input.end, openEnded: input.end === null }, now);
      if (pErr) return { ok: false, error: PERIOD_ERROR_TEXT[pErr] };
      const plateErr = validatePlate(input.plate);
      if (plateErr) return { ok: false, error: plateErr };
      if (findConflict(spot.id, { start: input.start, end: input.end }, cache))
        return { ok: false, error: "Это место уже забронировали на выбранное время. Выберите другое место или период." };
      const b: Booking = {
        id: newId(),
        spotId: spot.id,
        ownerId: ME,
        plate: normalizePlate(input.plate),
        startAt: input.start,
        plannedEndAt: input.end,
        actualEndAt: null,
        lifecycle: "confirmed",
        hourlyRate: rateFor(spot),
        createdAt: now,
        finalCost: null,
        idempotencyKey: input.idempotencyKey,
      };
      commit([...cache, b]);
      return { ok: true, value: b };
    },
    cancel(id) {
      return update(id, (b) => {
        if (bookingView(b, clock()) !== "upcoming") return { ok: false, error: "Отменить можно только предстоящее бронирование" };
        return { ok: true, value: { ...b, lifecycle: "cancelled" } };
      });
    },
    complete(id) {
      return update(id, (b) => {
        const now = clock();
        if (bookingView(b, now) !== "active") return { ok: false, error: "Завершить можно только активное бронирование" };
        return {
          ok: true,
          value: { ...b, lifecycle: "completed", actualEndAt: now, finalCost: calcCost(b.hourlyRate, now - b.startAt) },
        };
      });
    },
    reset() {
      cache = seedBookings(clock());
      try {
        storage?.setItem(SEEDED_KEY, "1");
        storage?.setItem(SEEDED_MALLS_KEY, "1");
      } catch {
        /* ignore */
      }
      commit(cache);
    },
  };
}

let singleton: BookingRepository | null = null;
export function getRepository(): BookingRepository {
  if (!singleton) {
    let storage: StorageLike | null = null;
    try {
      storage = typeof window !== "undefined" ? window.localStorage : null;
    } catch {
      storage = null;
    }
    singleton = createLocalRepository(storage);
  }
  return singleton;
}

export const LOT = DEMO_LOT;
