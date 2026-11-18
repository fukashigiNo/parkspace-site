import type { SpotAvailability } from "@/domain/booking/Booking";
import { LOT_TZ, MINUTE } from "@/domain/shared/time";

export function formatTenge(n: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(n)} ₸`;
}

export function formatRate(rate: number): string {
  return rate === 0 ? "Бесплатно" : `${formatTenge(rate)}/час`;
}

export function formatDateTime(ms: number, tz: string = LOT_TZ): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: tz,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

export function formatDuration(ms: number): string {
  const totalMin = Math.ceil(ms / MINUTE);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const out: string[] = [];
  if (d) out.push(`${d} ${plural(d, "день", "дня", "дней")}`);
  if (h) out.push(`${h} ч`);
  if (m || out.length === 0) out.push(`${m} мин`);
  return out.join(" ");
}

function plural(n: number, one: string, few: string, many: string) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

/** Пояснение, почему место нельзя забронировать */
export function availabilityReason(a: SpotAvailability): string {
  if (a.status === "closed") return a.reason ?? "Место закрыто администрацией";
  if (a.status === "unavailable") {
    const until = a.conflict.end === null ? "без даты окончания" : `до ${formatDateTime(a.conflict.end)}`;
    return `Забронировано с ${formatDateTime(a.conflict.start)} ${until}`;
  }
  return "";
}
