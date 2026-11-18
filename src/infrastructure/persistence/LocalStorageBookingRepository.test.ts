import { describe, expect, it } from "vitest";
import type { Booking } from "@/domain/booking/Booking";
import { createLocalStorageBookingRepository, STORAGE_KEYS } from "./LocalStorageBookingRepository";
import { LOTS } from "../catalog/lots";

function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}

const bk = (id: string, spotId = "A05"): Booking => ({
  id, spotId, ownerId: "me", plate: "1", startAt: 1, plannedEndAt: 2, actualEndAt: null,
  lifecycle: "confirmed", hourlyRate: 300, createdAt: 0, finalCost: null, idempotencyKey: id,
});
const seeds = { all: () => [bk("seed-central"), bk("seed-mall", "MG-A01")], malls: () => [bk("seed-mall", "MG-A01")] };

describe("localStorage", () => {
  it("первый запуск: демо-расписание", () => {
    expect(createLocalStorageBookingRepository(memStorage(), seeds).list()).toHaveLength(2);
  });

  it("данные восстанавливаются после перезагрузки, повреждённые — без падения", () => {
    const st = memStorage();
    createLocalStorageBookingRepository(st, seeds).add(bk("mine"));
    expect(createLocalStorageBookingRepository(st, seeds).list().some((b) => b.id === "mine")).toBe(true);
    st.m.set(STORAGE_KEYS.bookings, "{не json");
    expect(createLocalStorageBookingRepository(st, seeds).list()).toHaveLength(0);
  });

  it("пользователи первой версии получают расписание ТЦ, их брони сохраняются", () => {
    const st = memStorage();
    st.m.set(STORAGE_KEYS.seeded, "1");
    st.m.set(STORAGE_KEYS.bookings, JSON.stringify([bk("mine")]));
    const list = createLocalStorageBookingRepository(st, seeds).list();
    expect(list.map((b) => b.id)).toEqual(["mine", "seed-mall"]);
    expect(createLocalStorageBookingRepository(st, seeds).list()).toHaveLength(2);
  });

  it("без хранилища работает в памяти", () => {
    const r = createLocalStorageBookingRepository(null, seeds);
    r.add(bk("x"));
    expect(r.list()).toHaveLength(1);
  });
});

describe("каталог парковок", () => {
  it("id мест уникальны во всех парковках", () => {
    const ids = LOTS.flatMap((l) => l.spots.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("есть Shymkent Plaza, MEGA Center и Центральная", () => {
    expect(LOTS.map((l) => l.id)).toEqual(expect.arrayContaining(["shymkent-plaza", "mega-center", "central"]));
  });
});
