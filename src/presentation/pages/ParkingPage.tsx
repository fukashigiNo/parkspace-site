import { ClientOnly } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { List, Box, Info } from "lucide-react";
import type { Booking } from "@/domain/booking/Booking";
import { validatePeriod } from "@/domain/booking/rules";
import { HOUR, nextFiveMinuteBoundary } from "@/domain/shared/time";
import { lotStats, occupancyAt, spotStatuses } from "@/application/queries/parking";
import { Button } from "@/presentation/ui/button";
import { cn } from "@/presentation/lib/utils";
import { PeriodForm, makeInput, periodFromInput, type PeriodInput } from "@/presentation/components/booking/PeriodForm";
import { FiltersBar } from "@/presentation/components/booking/FiltersBar";
import { Legend } from "@/presentation/components/booking/StatusBadge";
import { SpotList } from "@/presentation/components/booking/SpotList";
import { SpotPanel } from "@/presentation/components/booking/SpotPanel";
import { LotPicker } from "@/presentation/components/booking/LotPicker";
import { DEFAULT_FILTERS, type Filters, type SpotDisplay } from "@/presentation/components/booking/spot-display";
import { SceneArea } from "@/presentation/components/scene/SceneArea";
import type { ParkAnim } from "@/presentation/components/scene/ParkingScene";
import { useBookings, useCatalog, useNow } from "@/presentation/hooks/use-parking";
import { BOOKING_ERROR_TEXT } from "@/presentation/i18n/labels";

export function ParkingPage({ lotId, onLotChange }: { lotId: string | undefined; onLotChange: (id: string) => void }) {
  const now = useNow(30_000);
  const bookings = useBookings();
  const catalog = useCatalog();
  const lot = catalog.findLot(lotId ?? catalog.defaultLotId()) ?? catalog.lots()[0]!;
  const [parkAnim, setParkAnim] = useState<ParkAnim | null>(null);
  const [animating, setAnimating] = useState(false);
  const [input, setInput] = useState<PeriodInput | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"3d" | "list">("3d");
  const [webglFailed, setWebglFailed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setInput(makeInput(nextFiveMinuteBoundary(Date.now()), HOUR));
  }, []);

  const { start, end } = input ? periodFromInput(input) : { start: null, end: null };
  const errKey = input && now !== null ? validatePeriod({ start, end, openEnded: input.openEnded }, now) : null;
  const periodError = errKey ? BOOKING_ERROR_TEXT[errKey] : null;
  // Для статусов используем период, даже если начало уже в прошлом, чтобы схема не «мигала»
  const statusPeriod = start !== null && (input?.openEnded || (end !== null && end > start)) ? { start, end } : null;

  const display = useMemo(() => {
    const out: Record<string, SpotDisplay> = {};
    for (const [id, { matchesFilters, ...a }] of Object.entries(spotStatuses(lot, statusPeriod, bookings, filters))) {
      out[id] = { ...a, dimmed: !matchesFilters };
    }
    return out;
  }, [lot, bookings, filters, statusPeriod?.start, statusPeriod?.end]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Кто стоит на месте прямо сейчас (по расписанию) */
  const occupiedNow = useMemo(() => (now === null ? {} : occupancyAt(bookings, now)), [bookings, now]);
  const stats = useMemo(() => lotStats(catalog.lots(), occupiedNow), [catalog, occupiedNow]);

  const availableCount = lot.spots.filter((s) => !display[s.id]!.dimmed && display[s.id]!.status === "available").length;
  const matchingCount = lot.spots.filter((s) => !display[s.id]!.dimmed).length;
  const selected = selectedId ? lot.spots.find((s) => s.id === selectedId) ?? null : null;

  const changeLot = (id: string) => {
    if (id === lot.id) return;
    setSelectedId(null);
    setSheetOpen(false);
    setParkAnim(null);
    setAnimating(false);
    setFilters(DEFAULT_FILTERS);
    onLotChange(id);
  };

  const onBooked = (b: Booking) => {
    setSheetOpen(false);
    if (webglFailed) return;
    setMode("3d");
    setParkAnim((p) => ({ spotId: b.spotId, plate: b.plate, n: (p?.n ?? 0) + 1 }));
    setAnimating(true);
  };

  const onSelect = useCallback((id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  }, []);
  const onFail = useCallback(() => {
    setWebglFailed(true);
    setMode("list");
  }, []);

  if (!input) return <div className="p-8 text-muted-foreground" role="status">Загрузка…</div>;

  const panel = (
    <SpotPanel
      key={selectedId ?? "none"}
      spot={selected}
      availability={selected ? display[selected.id] ?? null : null}
      period={periodError || !statusPeriod ? null : statusPeriod}
      periodError={periodError}
      onClose={() => setSheetOpen(false)}
      onBooked={onBooked}
    />
  );

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-3 py-4 sm:px-6">
      <LotPicker lots={catalog.lots()} value={lot.id} stats={stats} onChange={changeLot} />
      <PeriodForm value={input} onChange={setInput} error={periodError} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
        <section className="min-w-0 space-y-3" aria-labelledby="lot-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 id="lot-title" className="text-2xl font-bold tracking-tight">{lot.name}</h1>
              <p className="text-sm text-muted-foreground">
                {lot.city}, {lot.address} · <span className="font-semibold text-foreground">{availableCount}</span> доступно для выбранного периода
                {matchingCount !== lot.spots.length && " (с учётом фильтров)"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{lot.description}</p>
            </div>
            <div role="tablist" aria-label="Вид" className="inline-flex rounded-xl border bg-muted p-1 text-sm">
              {([["3d", "3D", Box], ["list", "Список", List]] as const).map(([m, label, Icon]) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  disabled={m === "3d" && webglFailed}
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
                    mode === m ? "bg-card font-semibold shadow-sm" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden /> {label}
                </button>
              ))}
            </div>
          </div>

          <FiltersBar value={filters} onChange={setFilters} zones={lot.rows.map((r) => r.zone)} />

          {webglFailed && (
            <p role="status" className="flex items-center gap-2 rounded-xl bg-status-selected-soft p-3 text-sm">
              <Info className="size-4" aria-hidden /> 3D-схема недоступна на этом устройстве. Выберите место в списке — бронирование работает так же.
            </p>
          )}

          {matchingCount === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center">
              <p className="font-semibold">Нет подходящих мест</p>
              <p className="text-sm text-muted-foreground">Попробуйте изменить период или фильтры.</p>
              <Button variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)}>Сбросить фильтры</Button>
            </div>
          ) : mode === "3d" ? (
            <ClientOnly fallback={<div className="h-[52vh] rounded-2xl border bg-muted lg:h-[560px]" />}>
              <SceneArea
                lot={lot}
                spots={lot.spots}
                display={display}
                selectedId={selectedId}
                onSelect={onSelect}
                onFail={onFail}
                occupiedNow={occupiedNow}
                parkAnim={parkAnim && lot.spots.some((s) => s.id === parkAnim.spotId) ? parkAnim : null}
                animating={animating}
                onAnimDone={() => setAnimating(false)}
              />
            </ClientOnly>
          ) : (
            <SpotList lot={lot} spots={lot.spots} display={display} selectedId={selectedId} onSelect={onSelect} />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Legend />
            <p className="text-xs text-muted-foreground">Доступность — по расписанию бронирований, не по датчикам.</p>
          </div>
        </section>

        <aside className="hidden rounded-2xl border bg-card shadow-soft lg:block" aria-label="Карточка места">
          {panel}
        </aside>
      </div>

      {selected && sheetOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t bg-card shadow-soft lg:hidden" role="dialog" aria-label={`Место ${selected.code}`}>
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-border" aria-hidden />
          {panel}
        </div>
      )}
    </div>
  );
}
