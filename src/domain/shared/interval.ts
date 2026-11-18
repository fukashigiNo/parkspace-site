/** Полуоткрытые интервалы [start, end); end = null означает бесконечность */
export function intervalsOverlap(
  aStart: number,
  aEnd: number | null,
  bStart: number,
  bEnd: number | null,
): boolean {
  const ae = aEnd ?? Infinity;
  const be = bEnd ?? Infinity;
  return aStart < be && bStart < ae;
}
