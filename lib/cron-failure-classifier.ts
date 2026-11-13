/** Detect explicit nested failures in fulfilled operations-cron jobs.
 * Counts are diagnostic only; they are not proof of provider delivery.
 */
export function reportedJobFailures(value: unknown): number {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return 0;
  const item = value as Record<string, unknown>;
  const counts: number[] = [];
  for (const field of ["failed", "errors"] as const) {
    const raw = item[field];
    if (typeof raw === "number" && Number.isSafeInteger(raw) && raw > 0) counts.push(raw);
    else if (Array.isArray(raw) && raw.length > 0) counts.push(raw.length);
    else if (raw === true) counts.push(1);
  }
  if (item.ok === false || item.success === false ||
      (typeof item.error === "string" && item.error.trim().length > 0)) counts.push(1);
  return counts.length ? Math.max(...counts) : 0;
}
