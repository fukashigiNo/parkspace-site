import { useNow } from "@/presentation/hooks/use-parking";
import { calcCost } from "@/domain/booking/pricing";
import type { Booking } from "@/domain/booking/Booking";
import { formatTenge } from "@/presentation/format";

/** Обновляет только себя, не всё дерево */
export function LiveCharge({ booking }: { booking: Booking }) {
  const now = useNow(15_000);
  if (now === null) return null;
  return <span aria-live="off">{formatTenge(calcCost(booking.hourlyRate, now - booking.startAt))}</span>;
}
