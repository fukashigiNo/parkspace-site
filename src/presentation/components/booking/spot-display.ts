import type { SpotAvailability } from "@/domain/booking/Booking";

export { DEFAULT_FILTERS, type SpotFilters as Filters } from "@/application/queries/parking";
export { STATUS_LABEL } from "@/presentation/i18n/labels";

/** Как место показывается в схеме и списке */
export type SpotDisplay = SpotAvailability & { dimmed: boolean };
