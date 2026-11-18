import { Clock, Infinity as InfinityIcon } from "lucide-react";
import { Label } from "@/presentation/ui/label";
import { Input } from "@/presentation/ui/input";
import { Button } from "@/presentation/ui/button";
import { cn } from "@/presentation/lib/utils";
import { DAY, HOUR, MINUTE, utcToZonedInputs, zonedToUtc } from "@/domain/shared/time";
import { formatDuration } from "@/presentation/format";

export interface PeriodInput {
  startDate: string;
  startTime: string;
  openEnded: boolean;
  endDate: string;
  endTime: string;
}

export function periodFromInput(p: PeriodInput) {
  const start = zonedToUtc(p.startDate, p.startTime);
  const end = p.openEnded ? null : zonedToUtc(p.endDate, p.endTime);
  return { start, end };
}

export function makeInput(start: number, durationMs: number): PeriodInput {
  const s = utcToZonedInputs(start);
  const e = utcToZonedInputs(start + durationMs);
  return { startDate: s.date, startTime: s.time, openEnded: false, endDate: e.date, endTime: e.time };
}

const QUICK = [
  { label: "30 минут", ms: 30 * MINUTE },
  { label: "1 час", ms: HOUR },
  { label: "2 часа", ms: 2 * HOUR },
  { label: "Весь день", ms: DAY },
];

interface Props {
  value: PeriodInput;
  onChange: (v: PeriodInput) => void;
  error: string | null;
}

export function PeriodForm({ value, onChange, error }: Props) {
  const { start, end } = periodFromInput(value);
  const set = (patch: Partial<PeriodInput>) => onChange({ ...value, ...patch });
  const quick = (ms: number) => {
    if (start === null) return;
    const e = utcToZonedInputs(start + ms);
    set({ openEnded: false, endDate: e.date, endTime: e.time });
  };
  const durationText = !value.openEnded && start !== null && end !== null && end > start ? formatDuration(end - start) : null;

  return (
    <section aria-labelledby="period-title" className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="period-title" className="text-base font-semibold">Период парковки</h2>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          Время парковки: Алматы (Asia/Almaty)
        </span>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="sr-only">Начало</legend>
          <div>
            <Label htmlFor="sd">Дата начала</Label>
            <Input id="sd" type="date" value={value.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="st">Время начала</Label>
            <Input id="st" type="time" step={300} value={value.startTime} onChange={(e) => set({ startTime: e.target.value })} />
          </div>
        </fieldset>

        <div role="radiogroup" aria-label="Режим окончания" className="inline-flex rounded-xl border bg-muted p-1 text-sm">
          {[
            { v: false, label: "До выбранного времени", icon: Clock },
            { v: true, label: "Без даты окончания", icon: InfinityIcon },
          ].map((o) => (
            <button
              key={String(o.v)}
              type="button"
              role="radio"
              aria-checked={value.openEnded === o.v}
              onClick={() => set({ openEnded: o.v })}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                value.openEnded === o.v ? "bg-card font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <o.icon className="size-4" aria-hidden />
              {o.label}
            </button>
          ))}
        </div>

        {!value.openEnded && (
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="sr-only">Окончание</legend>
            <div>
              <Label htmlFor="ed">Дата окончания</Label>
              <Input id="ed" type="date" value={value.endDate} onChange={(e) => set({ endDate: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="et">Время окончания</Label>
              <Input id="et" type="time" step={300} value={value.endTime} onChange={(e) => set({ endTime: e.target.value })} />
            </div>
          </fieldset>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Быстро от начала:</span>
        {QUICK.map((q) => (
          <Button key={q.label} type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => quick(q.ms)}>
            {q.label}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground">«Весь день» — 24 часа с момента начала</span>
      </div>

      <div className="mt-3 text-sm" aria-live="polite">
        {error ? (
          <p role="alert" className="font-medium text-destructive">{error}</p>
        ) : value.openEnded ? (
          <p className="rounded-xl bg-status-selected-soft p-3 text-foreground">
            Место будет забронировано до завершения парковки. Итоговая стоимость зависит от длительности. Минимальная оплата — за 30 минут.
          </p>
        ) : (
          durationText && <p className="text-muted-foreground">Длительность: <span className="font-semibold text-foreground">{durationText}</span></p>
        )}
      </div>
    </section>
  );
}
