/**
 * Only preview rows are limited; exports must continue to receive the full
 * filtered/sorted dataset. Kept pure so CI can test this rule without a backend.
 */
export const REPORT_PREVIEW_BATCH_SIZE = 60;

export function getVisibleReportRows<T>(rows: readonly T[], visibleCount: number): T[] {
  const safeCount = Number.isFinite(visibleCount) ? Math.max(0, Math.floor(visibleCount)) : 0;
  return rows.slice(0, safeCount);
}

export function nextReportPreviewCount(
  visibleCount: number,
  totalRows: number,
  batchSize = REPORT_PREVIEW_BATCH_SIZE,
): number {
  const total = Number.isFinite(totalRows) ? Math.max(0, Math.floor(totalRows)) : 0;
  const current = Number.isFinite(visibleCount) ? Math.max(0, Math.floor(visibleCount)) : 0;
  const step = Number.isFinite(batchSize) ? Math.max(1, Math.floor(batchSize)) : REPORT_PREVIEW_BATCH_SIZE;
  return Math.min(total, current + step);
}
