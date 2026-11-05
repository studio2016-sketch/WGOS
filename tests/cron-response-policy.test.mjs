import test from "node:test";
import assert from "node:assert/strict";
import {summarizeCronHealth} from "../lib/cron-health-policy.ts";
import {buildSafeCronResponse} from "../lib/cron-response-policy.ts";

const fulfilled = (name, value) => ({name, settlement: {status: "fulfilled", value}});

test("successful jobs yield a minimal OK response", () => {
  const summary = summarizeCronHealth([fulfilled("discovery", {sent: 1, failed: 0, recipient: "private@example.com"})]);
  assert.deepEqual(buildSafeCronResponse("test-correlation", summary), {
    ran: true, correlationId: "test-correlation", status: "OK", rejectedJobs: 0,
    reportedFailures: 0, jobs: {discovery: "fulfilled"},
  });
});

test("fulfilled job failures are visible without exposing private payloads", () => {
  const summary = summarizeCronHealth([fulfilled("discovery", {
    sent: 0, failed: 3, errors: ["Invalid recipient private@example.com token=secret"],
  })]);
  const response = buildSafeCronResponse("test-correlation", summary);
  assert.equal(response.status, "DEGRADED");
  assert.equal(response.reportedFailures, 3);
  assert.equal(response.jobs.discovery, "reported_failures");
  assert.doesNotMatch(JSON.stringify(response), /private@example\.com|token=secret|Invalid recipient/);
});

test("rejected exceptions never enter the cron response", () => {
  const summary = summarizeCronHealth([{
    name: "gmail", settlement: {status: "rejected", reason: new Error("password=secret private@example.com")},
  }]);
  const response = buildSafeCronResponse("test-correlation", summary);
  assert.equal(response.rejectedJobs, 1);
  assert.equal(response.status, "DEGRADED");
  assert.equal(response.jobs.gmail, "rejected");
  assert.doesNotMatch(JSON.stringify(response), /password|secret|private@example\.com/);
});

test("mixed failures preserve independent rejected and reported counts", () => {
  const summary = summarizeCronHealth([
    fulfilled("discovery", {failed: 2}),
    {name: "recurring", settlement: {status: "rejected", reason: "private error"}},
    fulfilled("gmail", {skipped: 5}),
  ]);
  const response = buildSafeCronResponse("test-correlation", summary);
  assert.equal(response.reportedFailures, 2);
  assert.equal(response.rejectedJobs, 1);
  assert.deepEqual(response.jobs, {discovery: "reported_failures", recurring: "rejected", gmail: "fulfilled"});
});

test("no raw job result keys are included in response", () => {
  const summary = summarizeCronHealth([fulfilled("discovery", {customer: {email: "private@example.com"}, sent: 1})]);
  const response = buildSafeCronResponse("test-correlation", summary);
  assert.equal(Object.hasOwn(response, "discovery"), false);
  assert.equal(Object.hasOwn(response, "customer"), false);
  assert.doesNotMatch(JSON.stringify(response), /private@example\.com/);
});
