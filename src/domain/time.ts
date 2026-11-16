export const LOT_TZ = "Asia/Almaty";
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

function parts(ms: number, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const o = new Map<string, string>();
  for (const p of f.formatToParts(new Date(ms))) o.set(p.type, p.value);
  const n = (k: string) => Number(o.get(k) ?? 0);
  return { y: n("year"), mo: n("month"), d: n("day"), h: n("hour") % 24, mi: n("minute"), s: n("second") };
}

/** Смещение часового пояса (мс) в указанный момент */
export function tzOffset(ms: number, tz: string = LOT_TZ): number {
  const p = parts(ms, tz);
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** "YYYY-MM-DD" + "HH:mm" в часовом поясе парковки → UTC ms. null при ошибке ввода */
export function zonedToUtc(date: string, time: string, tz: string = LOT_TZ): number | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dm || !tm) return null;
  const guess = Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]));
  let result = guess - tzOffset(guess, tz);
  result = guess - tzOffset(result, tz);
  return Number.isFinite(result) ? result : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function utcToZonedInputs(ms: number, tz: string = LOT_TZ) {
  const p = parts(ms, tz);
  return { date: `${p.y}-${pad(p.mo)}-${pad(p.d)}`, time: `${pad(p.h)}:${pad(p.mi)}` };
}

export function nextFiveMinuteBoundary(now: number): number {
  const step = 5 * MINUTE;
  return Math.floor(now / step) * step + step;
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
