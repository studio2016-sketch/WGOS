/** Summarize job outcomes without persisting sensitive result or exception bodies. */
export function summarizeCronHealth(
  jobs: ReadonlyArray<{name: string; settlement: PromiseSettledResult<unknown>}>,
): {
  status: "OK" | "DEGRADED";
  rejected: number;
  reportedFailures: number;
  jobs: Record<string, "fulfilled" | "rejected" | "reported_failures">;
} {
  let rejected = 0;
  let reportedFailures = 0;
  const states: Record<string, "fulfilled" | "rejected" | "reported_failures"> = {};
  for (const {name, settlement} of jobs) {
    if (settlement.status === "rejected") {
      rejected++;
      states[name] = "rejected";
      continue;
    }
    const value = settlement.value;
    let count = 0;
    if (value !== null && typeof value === "object") {
      const result = value as Record<string, unknown>;
      if (typeof result.failed === "number" && Number.isFinite(result.failed) && result.failed > 0) {
        count = Math.ceil(result.failed);
      } else if (result.ok === false) {
        count = 1;
      }
    }
    reportedFailures += count;
    states[name] = count > 0 ? "reported_failures" : "fulfilled";
  }
  return {
    status: rejected > 0 || reportedFailures > 0 ? "DEGRADED" : "OK",
    rejected,
    reportedFailures,
    jobs: states,
  };
}
