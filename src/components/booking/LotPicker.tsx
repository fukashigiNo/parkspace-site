import { Building2, Clock, MapPin, ParkingCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParkingLot } from "@/domain/types";
import { formatTenge } from "@/domain/pricing";

export interface LotStats {
  freeNow: number;
  total: number;
}

export function LotPicker({
  lots,
  value,
  stats,
  onChange,
}: {
  lots: ParkingLot[];
  value: string;
  stats: Record<string, LotStats>;
  onChange: (id: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Парковка" className="grid gap-2 sm:grid-cols-3">
      {lots.map((l) => {
        const st = stats[l.id];
        const active = l.id === value;
        const load = st ? 1 - st.freeNow / st.total : 0;
        return (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(l.id)}
            className={cn(
              "group flex flex-col gap-1.5 rounded-2xl border bg-card p-3 text-left shadow-soft transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active && "ring-2",
            )}
            style={active ? ({ "--tw-ring-color": l.accent } as React.CSSProperties) : undefined}
          >
            <div className="flex items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: l.accent }} aria-hidden>
                {l.building ? <Building2 className="size-4" /> : <ParkingCircle className="size-4" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold leading-tight">{l.short}</span>
                <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="size-3 shrink-0" aria-hidden /> {l.address}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3" aria-hidden /> {l.hours}
              </span>
              <span className="font-medium">от {formatTenge(Math.min(...Object.values(l.rates).filter((r) => r > 0)))}/ч</span>
            </div>
            {st && (
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Свободно сейчас</span>
                  <span className="font-semibold">
                    {st.freeNow} из {st.total}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div
                    className={cn("h-full rounded-full", load > 0.85 ? "bg-status-unavailable" : load > 0.6 ? "bg-status-selected" : "bg-status-available")}
                    style={{ width: `${Math.max(4, load * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
