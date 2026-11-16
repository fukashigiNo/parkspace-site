import { describe, expect, it } from "vitest";
import { intervalsOverlap } from "./interval";
import { calcCost, billableMinutes } from "./pricing";
import { validatePeriod, findConflict, spotAvailability, bookingView } from "./booking";
import { zonedToUtc, utcToZonedInputs, MINUTE, HOUR, DAY } from "./time";
import { createLocalRepository, ME } from "@/data/bookingRepository";
import { LOTS, getSpot, rateFor } from "@/data/lot";
import type { Booking } from "./types";

const NOW = Date.UTC(2026, 10, 3, 6, 0);

function memStorage(seeded = true) {
  const m = new Map<string, string>();
  if (seeded) {
    m.set("parkspace.seeded.v1", "1");
    m.set("parkspace.seeded.malls.v1", "1");
  }
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}

const bk = (start: number, end: number | null, extra: Partial<Booking> = {}): Booking => ({
  id: "x", spotId: "A05", ownerId: ME, plate: "1", startAt: start, plannedEndAt: end, actualEndAt: null,
  lifecycle: "confirmed", hourlyRate: 300, createdAt: 0, finalCost: null, idempotencyKey: "k", ...extra,
});

describe("период", () => {
  const s = NOW + HOUR;
  it("ровно 30 минут проходит", () => expect(validatePeriod({ start: s, end: s + 30 * MINUTE, openEnded: false }, NOW)).toBeNull());
  it("29 минут отклоняется", () => expect(validatePeriod({ start: s, end: s + 29 * MINUTE, openEnded: false }, NOW)).toBe("tooShort"));
  it("конец раньше начала отклоняется", () => expect(validatePeriod({ start: s, end: s - MINUTE, openEnded: false }, NOW)).toBe("endBeforeStart"));
  it("начало в прошлом отклоняется", () => expect(validatePeriod({ start: NOW - MINUTE, end: NOW + HOUR, openEnded: false }, NOW)).toBe("past"));
  it("нет скрытого максимума", () => expect(validatePeriod({ start: s, end: s + 90 * DAY, openEnded: false }, NOW)).toBeNull());
});

describe("стоимость", () => {
  it("несколько дней: 3 дня по 300 ₸/ч = 21 600 ₸", () => expect(calcCost(300, 3 * DAY)).toBe(21600));
  it("минимум 30 минут", () => expect(calcCost(300, 5 * MINUTE)).toBe(150));
  it("округление минут вверх", () => expect(billableMinutes(45 * MINUTE + 1)).toBe(46));
  it("электромобиль 400 ₸/ч за 1 ч 30 мин = 600 ₸", () => expect(calcCost(400, 90 * MINUTE)).toBe(600));
});

describe("пересечения", () => {
  const t = NOW + HOUR;
  it("соседние интервалы не конфликтуют", () => expect(intervalsOverlap(t, t + HOUR, t + HOUR, t + 2 * HOUR)).toBe(false));
  it("частичное пересечение", () => expect(intervalsOverlap(t, t + HOUR, t + 30 * MINUTE, t + 2 * HOUR)).toBe(true));
  it("полное вложение", () => expect(intervalsOverlap(t, t + 3 * HOUR, t + HOUR, t + 2 * HOUR)).toBe(true));
  it("бессрочное конфликтует с будущим", () => expect(findConflict("A05", { start: t, end: null }, [bk(t + 10 * DAY, t + 10 * DAY + HOUR)])).toBeDefined());
  it("отменённая не блокирует", () => expect(findConflict("A05", { start: t, end: t + HOUR }, [bk(t, t + HOUR, { lifecycle: "cancelled" })])).toBeUndefined());
  it("закрытое место недоступно", () => expect(spotAvailability(getSpot("A12")!, { start: t, end: t + HOUR }, []).status).toBe("closed"));
});

describe("часовой пояс", () => {
  it("Asia/Almaty: 10:00 → 05:00 UTC независимо от устройства", () => {
    expect(zonedToUtc("2026-11-03", "10:00")).toBe(Date.UTC(2026, 10, 3, 5, 0));
    expect(utcToZonedInputs(Date.UTC(2026, 10, 3, 5, 0))).toEqual({ date: "2026-11-03", time: "10:00" });
  });
});

describe("репозиторий", () => {
  const input = (k: string, start = NOW + HOUR, end: number | null = NOW + 2 * HOUR) => ({ spotId: "A05", plate: " 123 abc 02 ", start, end, idempotencyKey: k });

  it("госномер нормализуется, повторный ключ не создаёт вторую бронь", () => {
    const r = createLocalRepository(memStorage(), () => NOW);
    const a = r.create(input("k1"));
    const b = r.create(input("k1"));
    expect(a.ok && a.value.plate).toBe("123 ABC 02");
    expect(a.ok && b.ok && a.value.id === b.value.id).toBe(true);
    expect(r.list()).toHaveLength(1);
  });

  it("пересечение отклоняется, отмена освобождает место", () => {
    const r = createLocalRepository(memStorage(), () => NOW);
    const a = r.create(input("k1"));
    expect(r.create(input("k2")).ok).toBe(false);
    if (a.ok) r.cancel(a.value.id);
    expect(r.create(input("k3")).ok).toBe(true);
  });

  it("досрочное завершение освобождает остаток и берёт минимум 30 минут", () => {
    let now = NOW;
    const r = createLocalRepository(memStorage(), () => now);
    const a = r.create(input("k1", NOW + MINUTE, NOW + 5 * HOUR));
    now = NOW + 11 * MINUTE;
    const done = a.ok ? r.complete(a.value.id) : null;
    expect(done?.ok && done.value.finalCost).toBe(150);
    expect(r.create(input("k2", now + MINUTE, now + HOUR)).ok).toBe(true);
  });

  it("данные восстанавливаются после перезагрузки, повреждённые — без падения", () => {
    const st = memStorage();
    createLocalRepository(st, () => NOW).create(input("k1"));
    expect(createLocalRepository(st, () => NOW).list()).toHaveLength(1);
    st.m.set("parkspace.bookings.v1", "{не json");
    expect(createLocalRepository(st, () => NOW).list()).toHaveLength(0);
  });

  it("конечная бронь становится завершённой по времени", () => {
    expect(bookingView(bk(NOW - 2 * HOUR, NOW - HOUR), NOW)).toBe("completed");
  });
});

describe("парковки ТЦ", () => {
  it("id мест уникальны во всех парковках", () => {
    const ids = LOTS.flatMap((l) => l.spots.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("есть Shymkent Plaza и MEGA Center", () => {
    expect(LOTS.map((l) => l.id)).toEqual(expect.arrayContaining(["shymkent-plaza", "mega-center", "central"]));
  });
  it("тариф берётся из парковки места", () => {
    expect(rateFor(getSpot("MG-A12")!)).toBe(200);
    expect(rateFor(getSpot("SP-A13")!)).toBe(350);
    expect(rateFor(getSpot("A05")!)).toBe(300);
  });
  it("бронь в ТЦ фиксирует тариф ТЦ", () => {
    const st = memStorage();
    const r = createLocalRepository(st, () => NOW).create({ spotId: "SP-B05", plate: "1", start: NOW + HOUR, end: NOW + 2 * HOUR, idempotencyKey: "m1" });
    expect(r.ok && r.value.hourlyRate).toBe(250);
  });
  it("пользователи первой версии получают расписание ТЦ, их брони сохраняются", () => {
    const st = memStorage(false);
    st.m.set("parkspace.seeded.v1", "1");
    st.m.set("parkspace.bookings.v1", JSON.stringify([bk(NOW + HOUR, NOW + 2 * HOUR, { id: "mine" })]));
    const list = createLocalRepository(st, () => NOW).list();
    expect(list.some((b) => b.id === "mine")).toBe(true);
    expect(list.some((b) => b.spotId.startsWith("MG-"))).toBe(true);
    expect(createLocalRepository(st, () => NOW).list()).toHaveLength(list.length);
  });
});
