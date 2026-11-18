import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/presentation/ui/button";
import { Input } from "@/presentation/ui/input";
import { Label } from "@/presentation/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/presentation/ui/alert-dialog";
import type { Booking, SpotAvailability } from "@/domain/booking/Booking";
import { rateFor, type ParkingSpot } from "@/domain/parking/ParkingLot";
import { calcCost, minimumCost } from "@/domain/booking/pricing";
import { normalizePlate, validatePlate, PLATE_MAX } from "@/domain/booking/rules";
import { getApp, useCatalog } from "@/presentation/hooks/use-parking";
import { BOOKING_ERROR_TEXT, SPOT_TYPE_LABEL } from "@/presentation/i18n/labels";
import { availabilityReason, formatDateTime, formatDuration, formatRate, formatTenge } from "@/presentation/format";
import { StatusBadge } from "./StatusBadge";

interface Props {
  spot: ParkingSpot | null;
  availability: SpotAvailability | null;
  period: { start: number; end: number | null } | null;
  periodError: string | null;
  onClose?: () => void;
  onBooked?: (b: Booking) => void;
}

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()));

export function SpotPanel({ spot, availability, period, periodError, onClose, onBooked }: Props) {
  const [plate, setPlate] = useState("");
  const [plateTouched, setPlateTouched] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);
  const keyRef = useRef<string | null>(null);
  const inFlight = useRef(false);
  const catalog = useCatalog();

  if (!spot) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
        <MapPin className="size-8" aria-hidden />
        <p className="font-medium text-foreground">Выберите место</p>
        <p className="text-sm">Нажмите на место на схеме или в списке, чтобы увидеть условия и забронировать.</p>
      </div>
    );
  }

  const lot = catalog.findLot(spot.lotId)!;
  const rate = rateFor(lot, spot);
  const plateErrorCode = validatePlate(plate);
  const plateError = plateErrorCode ? BOOKING_ERROR_TEXT[plateErrorCode] : null;
  const blocked = availability?.status !== "available";
  const canBook = !blocked && !periodError && period !== null && !plateError && !submitting;
  const cost = period && period.end !== null ? calcCost(rate, period.end - period.start) : null;

  const openConfirm = () => {
    setPlateTouched(true);
    setError(null);
    if (!canBook) return;
    keyRef.current ??= newKey();
    setConfirmOpen(true);
  };

  const submit = () => {
    if (inFlight.current || !period || !keyRef.current) return;
    inFlight.current = true;
    setSubmitting(true);
    const r = getApp().createBooking({ spotId: spot.id, plate, start: period.start, end: period.end, idempotencyKey: keyRef.current });
    inFlight.current = false;
    setSubmitting(false);
    setConfirmOpen(false);
    if (r.ok) {
      keyRef.current = null;
      setBooked(true);
      setPlate("");
      setPlateTouched(false);
      toast.success(`Место ${spot.code} забронировано`, {
        description: `${lot.short}. Смотрите, как автомобиль ${r.value.plate} заезжает на место. Оплата в демо не выполняется.`,
      });
      onBooked?.(r.value);
    } else {
      keyRef.current = null;
      setError(BOOKING_ERROR_TEXT[r.error]);
    }
  };

  const rows: [string, string][] = [
    ["Парковка", lot.short],
    ["Зона", spot.zone],
    ["Тип", SPOT_TYPE_LABEL[spot.type]],
    ["Тариф", `${formatRate(rate)}${spot.type === "ev" && rate > 0 ? " · зарядка не включена" : ""}`],
    ["Начало", period ? formatDateTime(period.start) : "—"],
    ["Окончание", period ? (period.end === null ? "Без даты окончания" : formatDateTime(period.end)) : "—"],
  ];
  if (period && period.end !== null) rows.push(["Длительность", formatDuration(period.end - period.start)]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Выбранное место</p>
          <h2 className="text-3xl font-extrabold tracking-tight">{spot.code}</h2>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={blocked ? availability!.status : "selected"} short />
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Закрыть карточку места"><X /></Button>
          )}
        </div>
      </div>

      {booked && (
        <div role="status" className="rounded-xl border border-status-available bg-status-available-soft p-3 text-sm">
          <p className="font-semibold">Бронирование оформлено</p>
          <p>Оно уже в разделе «Мои бронирования». Чтобы забронировать ещё, выберите другое место или период.</p>
        </div>
      )}

      {!booked && availability && availability.status !== "available" && (
        <div role="alert" className="flex gap-2 rounded-xl border border-status-unavailable bg-status-unavailable-soft p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{availability.status === "closed" ? "Место закрыто" : "Место недоступно в выбранное время"}</p>
            <p>{availabilityReason(availability)}</p>
            <p className="mt-1 text-muted-foreground">Выберите другое место или измените период.</p>
          </div>
        </div>
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-xl bg-muted p-3">
        {cost !== null ? (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Стоимость</span>
            <span className="text-2xl font-bold">{formatTenge(cost)}</span>
          </div>
        ) : (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Минимальная стоимость (30 мин)</span>
            <span className="text-2xl font-bold">{formatTenge(minimumCost(rate))}</span>
          </div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">Демонстрационный тариф. Оплата не выполняется.</p>
      </div>

      <div>
        <Label htmlFor="plate">Госномер автомобиля</Label>
        <Input
          id="plate"
          value={plate}
          maxLength={PLATE_MAX + 5}
          autoComplete="off"
          placeholder="Например, 123 ABC 17"
          aria-invalid={plateTouched && !!plateError}
          aria-describedby="plate-err"
          onChange={(e) => { setPlate(e.target.value); setError(null); }}
          onBlur={() => { setPlateTouched(true); setPlate((p) => normalizePlate(p)); }}
          className="uppercase"
        />
        <p id="plate-err" className="mt-1 min-h-4 text-xs text-destructive">{plateTouched ? plateError : ""}</p>
      </div>

      {error && <p role="alert" className="rounded-xl bg-status-unavailable-soft p-3 text-sm font-medium">{error}</p>}

      <Button size="lg" className="h-12 rounded-xl text-base" disabled={blocked || !!periodError || submitting} onClick={openConfirm}>
        Забронировать
      </Button>
      <Link to="/bookings" className="text-center text-sm text-primary underline-offset-4 hover:underline">Мои бронирования</Link>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !submitting && setConfirmOpen(o)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите бронирование</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-sm text-foreground">
                <p>{lot.name}</p>
                <p>Место <b>{spot.code}</b>, зона {spot.zone}, {SPOT_TYPE_LABEL[spot.type].toLowerCase()}</p>
                <p>Автомобиль: <b>{normalizePlate(plate)}</b></p>
                {period && <p>С {formatDateTime(period.start)} {period.end === null ? "без даты окончания" : `до ${formatDateTime(period.end)}`}</p>}
                <p>Тариф: {formatRate(rate)}</p>
                <p>{cost !== null ? <>Стоимость: <b>{formatTenge(cost)}</b></> : <>Минимальная оплата: <b>{formatTenge(minimumCost(rate))}</b>, итог по факту</>}</p>
                <p className="text-muted-foreground">Отмена до начала бесплатна. Оплата в демо не выполняется.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Назад</AlertDialogCancel>
            <AlertDialogAction disabled={submitting} onClick={(e) => { e.preventDefault(); submit(); }}>
              {submitting ? "Бронируем…" : "Подтвердить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
