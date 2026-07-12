import assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_ATTEMPTS, checkBudget, decideAfterFailure, isoDate } from "../logic";
import { resolveHandler } from "../registry";

test("resolveHandler finds the registered manager health_check handler", async () => {
  const entry = resolveHandler("manager", "health_check");
  assert.ok(entry);
  assert.equal(entry.agent, "manager");
  const result = await entry.handler({} as never);
  assert.equal(result.ok, true);
});

test("resolveHandler returns undefined for an unregistered unit:type", () => {
  assert.equal(resolveHandler("reselling", "list_item"), undefined);
});

test("checkBudget allows unlimited when no budget row exists", () => {
  const result = checkBudget(null, "2026-07-12");
  assert.equal(result.allowed, true);
});

test("checkBudget allows uncapped agents (max_actions_per_day null)", () => {
  const result = checkBudget(
    {
      max_actions_per_day: null,
      actions_today: 9999,
      max_tokens_per_day: null,
      tokens_today: 0,
      period_start: "2026-07-12",
    },
    "2026-07-12"
  );
  assert.equal(result.allowed, true);
});

test("checkBudget blocks once today's actions hit the cap", () => {
  const result = checkBudget(
    {
      max_actions_per_day: 10,
      actions_today: 10,
      max_tokens_per_day: null,
      tokens_today: 0,
      period_start: "2026-07-12",
    },
    "2026-07-12"
  );
  assert.equal(result.allowed, false);
  assert.match(result.reason!, /Daily action budget exhausted/);
});

test("checkBudget treats a stale period_start as a fresh day (rollover)", () => {
  const result = checkBudget(
    {
      max_actions_per_day: 10,
      actions_today: 10, // maxed out yesterday
      max_tokens_per_day: null,
      tokens_today: 0,
      period_start: "2026-07-11",
    },
    "2026-07-12"
  );
  assert.equal(result.allowed, true);
});

test("decideAfterFailure retries before hitting MAX_ATTEMPTS", () => {
  const decision = decideAfterFailure(0);
  assert.equal(decision.outcome, "retry");
  if (decision.outcome === "retry") {
    assert.equal(decision.nextRetryCount, 1);
    assert.ok(decision.dueAt.getTime() > Date.now());
  }
});

test("decideAfterFailure escalates once MAX_ATTEMPTS is reached", () => {
  const decision = decideAfterFailure(MAX_ATTEMPTS - 1);
  assert.equal(decision.outcome, "escalate");
});

test("isoDate formats as YYYY-MM-DD", () => {
  assert.equal(isoDate(new Date("2026-07-12T15:30:00Z")), "2026-07-12");
});
