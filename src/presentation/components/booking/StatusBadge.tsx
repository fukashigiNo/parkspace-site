import { cn } from "@/presentation/lib/utils";
import { STATUS_LABEL } from "@/presentation/i18n/labels";

type S = keyof typeof STATUS_LABEL;

const STYLE: Record<S, string> = {
  available: "bg-status-available-soft text-foreground before:bg-status-available",
  unavailable: "bg-status-unavailable-soft text-foreground before:bg-status-unavailable",
  closed: "bg-status-closed-soft text-foreground before:bg-status-closed",
  selected: "bg-status-selected-soft text-foreground before:bg-status-selected",
};

export function StatusBadge({ status, short, className }: { status: S; short?: boolean; className?: string }) {
  const label = short && status === "unavailable" ? "Недоступно" : STATUS_LABEL[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium before:size-2 before:rounded-full before:content-['']",
        STYLE[status],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function Legend() {
  return (
    <ul aria-label="Обозначения статусов" className="flex flex-wrap gap-2">
      {(Object.keys(STATUS_LABEL) as S[]).map((s) => (
        <li key={s}><StatusBadge status={s} /></li>
      ))}
    </ul>
  );
}
