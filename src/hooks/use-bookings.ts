import { useEffect, useState, useSyncExternalStore } from "react";
import type { Booking } from "@/domain/types";
import { getRepository } from "@/data/bookingRepository";

const EMPTY: readonly Booking[] = [];

export function useBookings(): readonly Booking[] {
  return useSyncExternalStore(
    (cb) => getRepository().subscribe(cb),
    () => getRepository().list(),
    () => EMPTY,
  );
}

/** Текущее время, обновляемое с заданным интервалом (только после гидратации) */
export function useNow(intervalMs: number): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
