import { useNow } from "@/hooks/use-bookings";
import { calcCost, formatTenge } from "@/domain/pricing";
import type { Booking } from "@/domain/types";

/** Обновляет только себя, не всё дерево */
export function LiveCharge({ booking }: { booking: Booking }) {
  const now = useNow(15_000);
  if (now === null) return null;
  return <span aria-live="off">{formatTenge(calcCost(booking.hourlyRate, now - booking.startAt))}</span>;
}
