import { toast } from "sonner";
import { Button } from "@/presentation/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/presentation/ui/alert-dialog";
import type { Booking } from "@/domain/booking/Booking";
import type { BookingError } from "@/domain/booking/errors";
import type { Result } from "@/domain/shared/result";
import { bookingCost, bookingView } from "@/domain/booking/rules";
import { getApp, useCatalog } from "@/presentation/hooks/use-parking";
import { BOOKING_ERROR_TEXT, SPOT_TYPE_LABEL, VIEW_LABEL } from "@/presentation/i18n/labels";
import { formatDateTime, formatDuration, formatRate, formatTenge } from "@/presentation/format";
import { LiveCharge } from "./LiveCharge";


export function BookingCard({ booking: b, now }: { booking: Booking; now: number }) {
  const view = bookingView(b, now);
  const catalog = useCatalog();
  const spot = catalog.findSpot(b.spotId);
  const lot = spot ? catalog.findLot(spot.lotId) : undefined;
  const cost = bookingCost(b, now);
  const endText = b.actualEndAt
    ? `${formatDateTime(b.actualEndAt)} (завершено досрочно)`
    : b.plannedEndAt === null
      ? "без даты окончания"
      : formatDateTime(b.plannedEndAt);

  const run = (fn: () => Result<Booking, BookingError>, okMsg: string) => {
    const r = fn();
    if (r.ok) toast.success(okMsg);
    else toast.error(BOOKING_ERROR_TEXT[r.error]);
  };

  return (
    <article className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{lot?.name ?? "Парковка"}</p>
          <h2 className="text-xl font-bold">Место {spot?.code ?? b.spotId}</h2>
          <p className="text-xs text-muted-foreground">Зона {spot?.zone} · {spot ? SPOT_TYPE_LABEL[spot.type] : ""}</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{VIEW_LABEL[view]}</span>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Автомобиль</dt><dd className="font-medium">{b.plate}</dd>
        <dt className="text-muted-foreground">Период</dt><dd>{formatDateTime(b.startAt)} — {endText}</dd>
        <dt className="text-muted-foreground">Тариф</dt><dd>{formatRate(b.hourlyRate)}</dd>
        <dt className="text-muted-foreground">
          {cost.kind === "accrued" ? "Начислено на текущий момент" : cost.kind === "minimum" ? "Минимальная оплата" : cost.kind === "final" ? "Итоговая стоимость" : "Стоимость"}
        </dt>
        <dd className="font-semibold">
          {cost.kind === "accrued" ? <LiveCharge booking={b} /> : formatTenge(cost.amount)}
        </dd>
      </dl>

      {view === "upcoming" && (
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="outline" className="mt-3 rounded-lg">Отменить</Button></AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Отменить бронирование {spot?.code}?</AlertDialogTitle>
              <AlertDialogDescription>Отмена бесплатна в рамках демо. Место станет доступно другим водителям.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Не отменять</AlertDialogCancel>
              <AlertDialogAction onClick={() => run(() => getApp().cancelBooking(b.id), "Бронирование отменено")}>Отменить бронирование</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {view === "active" && (
        <AlertDialog>
          <AlertDialogTrigger asChild><Button className="mt-3 rounded-lg">Завершить парковку</Button></AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Завершить парковку на месте {spot?.code}?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-1 text-sm">
                  <p>Окончание будет зафиксировано сейчас, оставшийся период освободится.</p>
                  <p>Стоимость считается по фактической длительности ({formatDuration(now - b.startAt)}), минимум за 30 минут.</p>
                  <p>Ориентировочно: <b>{formatTenge(bookingCost({ ...b, plannedEndAt: null }, now).amount)}</b>. Оплата в демо не выполняется.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Продолжить парковку</AlertDialogCancel>
              <AlertDialogAction onClick={() => run(() => getApp().completeBooking(b.id), "Парковка завершена")}>Завершить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </article>
  );
}
