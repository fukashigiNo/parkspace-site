import { Label } from "@/presentation/ui/label";
import { Switch } from "@/presentation/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/ui/select";
import type { SpotType } from "@/domain/parking/ParkingLot";
import { SPOT_TYPE_LABEL } from "@/presentation/i18n/labels";
import type { Filters } from "./spot-display";

export function FiltersBar({ value, onChange, zones }: { value: Filters; onChange: (f: Filters) => void; zones: string[] }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-32">
        <Label htmlFor="fz" className="text-xs">Зона</Label>
        <Select value={value.zone} onValueChange={(v) => onChange({ ...value, zone: v })}>
          <SelectTrigger id="fz" className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все зоны</SelectItem>
            {zones.map((z) => <SelectItem key={z} value={z}>Зона {z}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="w-60">
        <Label htmlFor="ft" className="text-xs">Тип места</Label>
        <Select value={value.type} onValueChange={(v) => onChange({ ...value, type: v as SpotType | "all" })}>
          <SelectTrigger id="ft" className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {(Object.keys(SPOT_TYPE_LABEL) as SpotType[]).map((t) => <SelectItem key={t} value={t}>{SPOT_TYPE_LABEL[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex h-9 items-center gap-2">
        <Switch id="fa" checked={value.onlyAvailable} onCheckedChange={(c) => onChange({ ...value, onlyAvailable: c })} />
        <Label htmlFor="fa">Только доступные</Label>
      </div>
    </div>
  );
}
