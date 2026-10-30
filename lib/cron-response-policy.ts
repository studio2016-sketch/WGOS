import type {summarizeCronHealth} from "./cron-health-policy";

type CronHealthSummary = ReturnType<typeof summarizeCronHealth>;

/** Safe cron response: no customer records, job payloads or provider exceptions. */
export function buildSafeCronResponse(correlationId: string, health: CronHealthSummary) {
  return {
    ran: true,
    correlationId,
    status: health.status,
    rejectedJobs: health.rejected,
    reportedFailures: health.reportedFailures,
    jobs: health.jobs,
  };
}
