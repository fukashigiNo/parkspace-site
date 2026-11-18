import { describe, expect, it } from "vitest";
import { HOUR, MINUTE } from "@/domain/shared/time";
import { createParkingApp } from "../ParkingApp";
import { createInMemoryBookingRepository } from "@/infrastructure/persistence/InMemoryBookingRepository";
import { createStaticCatalog } from "@/infrastructure/catalog/StaticParkingLotCatalog";
import { DEFAULT_LOT_ID, LOTS } from "@/infrastructure/catalog/lots";

const NOW = Date.UTC(2026, 10, 3, 6, 0);

function setup(userId = "me") {
  let now = NOW;
  let n = 0;
  const bookings = createInMemoryBookingRepository();
  const app = createParkingApp({
    bookings,
    catalog: createStaticCatalog(LOTS, DEFAULT_LOT_ID),
    clock: { now: () => now },
    ids: { next: () => `id-${++n}` },
    user: { id: () => userId },
    demo: { bookings: () => [] },
  });
  return { app, bookings, setNow: (t: number) => (now = t) };
}

const input = (k: string, spotId = "A05", start = NOW + HOUR, end: number | null = NOW + 2 * HOUR) => ({
  spotId, plate: " 123 abc 02 ", start, end, idempotencyKey: k,
});

describe("создание брони", () => {
  it("госномер нормализуется, повторный ключ не создаёт вторую бронь", () => {
    const { app, bookings } = setup();
    const a = app.createBooking(input("k1"));
    const b = app.createBooking(input("k1"));
    expect(a.ok && a.value.plate).toBe("123 ABC 02");
    expect(a.ok && b.ok && a.value.id === b.value.id).toBe(true);
    expect(bookings.list()).toHaveLength(1);
  });

  it("пересечение отклоняется кодом conflict", () => {
    const { app } = setup();
    app.createBooking(input("k1"));
    expect(app.createBooking(input("k2"))).toEqual({ ok: false, error: "conflict" });
  });

  it("закрытое место и неизвестное место отклоняются", () => {
    const { app } = setup();
    expect(app.createBooking(input("k1", "A12"))).toEqual({ ok: false, error: "spotClosed" });
    expect(app.createBooking(input("k2", "Z99"))).toEqual({ ok: false, error: "spotNotFound" });
  });

  it("тариф фиксируется по парковке места", () => {
    const { app } = setup();
    const r = app.createBooking(input("m1", "SP-B05"));
    expect(r.ok && r.value.hourlyRate).toBe(250);
    const m = app.createBooking(input("m2", "MG-A12"));
    expect(m.ok && m.value.hourlyRate).toBe(200);
  });
});

describe("управление бронью", () => {
  it("отмена освобождает место", () => {
    const { app } = setup();
    const a = app.createBooking(input("k1"));
    if (a.ok) expect(app.cancelBooking(a.value.id).ok).toBe(true);
    expect(app.createBooking(input("k3")).ok).toBe(true);
  });

  it("досрочное завершение освобождает остаток и берёт минимум 30 минут", () => {
    const { app, setNow } = setup();
    const a = app.createBooking(input("k1", "A05", NOW + MINUTE, NOW + 5 * HOUR));
    setNow(NOW + 11 * MINUTE);
    const done = a.ok ? app.completeBooking(a.value.id) : null;
    expect(done?.ok && done.value.finalCost).toBe(150);
    expect(app.createBooking(input("k2", "A05", NOW + 12 * MINUTE, NOW + HOUR)).ok).toBe(true);
  });

  it("чужую бронь нельзя отменить", () => {
    const owner = setup("owner");
    const a = owner.app.createBooking(input("k1"));
    const other = createParkingApp({
      bookings: owner.bookings,
      catalog: createStaticCatalog(LOTS, DEFAULT_LOT_ID),
      clock: { now: () => NOW },
      ids: { next: () => "x" },
      user: { id: () => "stranger" },
      demo: { bookings: () => [] },
    });
    expect(a.ok && other.cancelBooking(a.value.id)).toEqual({ ok: false, error: "notOwner" });
  });

  it("активную бронь нельзя отменить", () => {
    const { app, setNow } = setup();
    const a = app.createBooking(input("k1"));
    setNow(NOW + HOUR + MINUTE);
    expect(a.ok && app.cancelBooking(a.value.id)).toEqual({ ok: false, error: "cancelOnlyUpcoming" });
  });
});
