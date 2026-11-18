import { cn } from "@/presentation/lib/utils";
import { rateFor, type ParkingLot, type ParkingSpot } from "@/domain/parking/ParkingLot";
import { SPOT_TYPE_LABEL } from "@/presentation/i18n/labels";
import { formatRate } from "@/presentation/format";
import type { SpotDisplay } from "./spot-display";
import { StatusBadge } from "./StatusBadge";

interface Props {
  lot: ParkingLot;
  spots: ParkingSpot[];
  display: Record<string, SpotDisplay>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SpotList({ lot, spots, display, selectedId, onSelect }: Props) {
  const visible = spots.filter((s) => !display[s.id]?.dimmed);
  return (
    <div role="listbox" aria-label="Места парковки" className="grid max-h-[560px] grid-cols-1 gap-2 overflow-y-auto p-1 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map((s) => {
        const d = display[s.id]!;
        const sel = s.id === selectedId;
        return (
          <button
            key={s.id}
            type="button"
            role="option"
            aria-selected={sel}
            onClick={() => onSelect(s.id)}
            className={cn(
              "flex items-start justify-between gap-2 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              sel && "border-status-selected ring-2 ring-status-selected",
            )}
          >
            <div>
              <div className="text-lg font-bold">{s.code}</div>
              <div className="text-xs text-muted-foreground">Зона {s.zone} · {SPOT_TYPE_LABEL[s.type]}</div>
              <div className="mt-1 text-xs">{formatRate(rateFor(lot, s))}</div>
            </div>
            <StatusBadge status={sel ? "selected" : d.status} short />
          </button>
        );
      })}
    </div>
  );
}
