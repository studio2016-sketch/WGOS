import test from "node:test";
import assert from "node:assert/strict";
import {summarizeCronHealth} from "../lib/cron-health-policy.ts";

const done = (name, value) => ({name, settlement: {status: "fulfilled", value}});

test("all successful or skipped jobs are OK", () => {
  const health = summarizeCronHealth([done("discovery", {sent: 0, skipped: 6, failed: 0}), done("gmail", {skipped: 1})]);
  assert.equal(health.status, "OK");
  assert.equal(health.reportedFailures, 0);
});

test("fulfilled discovery job reporting failed deliveries degrades health", () => {
  const health = summarizeCronHealth([done("discovery", {sent: 1, failed: 2, errors: ["INVALID_CONTACT_EMAIL"]})]);
  assert.equal(health.status, "DEGRADED");
  assert.equal(health.reportedFailures, 2);
  assert.equal(health.jobs.discovery, "reported_failures");
  assert.equal(JSON.stringify(health).includes("INVALID_CONTACT_EMAIL"), false);
});

test("rejected promises degrade health independently", () => {
  const health = summarizeCronHealth([{name: "recurring", settlement: {status: "rejected", reason: new Error("sensitive data")}}]);
  assert.equal(health.status, "DEGRADED");
  assert.equal(health.rejected, 1);
  assert.equal(JSON.stringify(health).includes("sensitive data"), false);
});

test("explicit ok false degrades health, but nonnumeric failure values do not invent counts", () => {
  const health = summarizeCronHealth([done("gmail", {ok: false}), done("other", {failed: "unknown"})]);
  assert.equal(health.status, "DEGRADED");
  assert.equal(health.reportedFailures, 1);
  assert.equal(health.jobs.other, "fulfilled");
});
