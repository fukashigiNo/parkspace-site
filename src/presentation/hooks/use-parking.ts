import { useEffect, useState, useSyncExternalStore } from "react";
import type { Booking } from "@/domain/booking/Booking";
import { catalog, getParkingApp } from "@/di/container";

const EMPTY: readonly Booking[] = [];

/** Прикладной слой (use cases). Вызывать в обработчиках: хранилище — браузерное. */
export const getApp = getParkingApp;

/** Справочник парковок доступен и на сервере (статические данные) */
export const useCatalog = () => catalog;

export function useBookings(): readonly Booking[] {
  return useSyncExternalStore(
    (cb) => getParkingApp().bookings.subscribe(cb),
    () => getParkingApp().bookings.list(),
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
