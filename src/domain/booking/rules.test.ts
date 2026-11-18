import { describe, expect, it } from "vitest";
import { intervalsOverlap } from "../shared/interval";
import { zonedToUtc, utcToZonedInputs, MINUTE, HOUR, DAY } from "../shared/time";
import type { ParkingSpot } from "../parking/ParkingLot";
import { calcCost, billableMinutes } from "./pricing";
import { bookingView, findConflict, spotAvailability, validatePeriod, validatePlate, normalizePlate } from "./rules";
import type { Booking } from "./Booking";

const NOW = Date.UTC(2026, 10, 3, 6, 0);

const bk = (start: number, end: number | null, extra: Partial<Booking> = {}): Booking => ({
  id: "x", spotId: "A05", ownerId: "u", plate: "1", startAt: start, plannedEndAt: end, actualEndAt: null,
  lifecycle: "confirmed", hourlyRate: 300, createdAt: 0, finalCost: null, idempotencyKey: "k", ...extra,
});

const spot = (extra: Partial<ParkingSpot> = {}): ParkingSpot => ({
  id: "A05", lotId: "l", code: "A05", zone: "A", type: "standard", closed: false, position: [0, 0], facing: 1, ...extra,
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
  it("закрытое место недоступно", () => expect(spotAvailability(spot({ closed: true }), { start: t, end: t + HOUR }, []).status).toBe("closed"));
  it("занятое место сообщает период конфликта", () =>
    expect(spotAvailability(spot(), { start: t, end: t + HOUR }, [bk(t, t + 2 * HOUR)])).toEqual({ status: "unavailable", conflict: { start: t, end: t + 2 * HOUR } }));
});

describe("госномер", () => {
  it("нормализуется", () => expect(normalizePlate("  123  abc 02 ")).toBe("123 ABC 02"));
  it("пустой — ошибка", () => expect(validatePlate("  ")).toBe("plateEmpty"));
  it("спецсимволы — ошибка", () => expect(validatePlate("12#3")).toBe("plateChars"));
  it("казахские буквы допустимы", () => expect(validatePlate("123 ҚҰҮ 02")).toBeNull());
});

describe("часовой пояс", () => {
  it("Asia/Almaty: 10:00 → 05:00 UTC независимо от устройства", () => {
    expect(zonedToUtc("2026-11-03", "10:00")).toBe(Date.UTC(2026, 10, 3, 5, 0));
    expect(utcToZonedInputs(Date.UTC(2026, 10, 3, 5, 0))).toEqual({ date: "2026-11-03", time: "10:00" });
  });
});

it("конечная бронь становится завершённой по времени", () => {
  expect(bookingView(bk(NOW - 2 * HOUR, NOW - HOUR), NOW)).toBe("completed");
});
