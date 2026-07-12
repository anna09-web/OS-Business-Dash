import type { Database } from "../types/database";

export type AgentBudgetRow = Database["public"]["Tables"]["agent_budgets"]["Row"];
export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

export const MAX_ATTEMPTS = 2; // 1 initial attempt + 1 retry, then escalate
export const RETRY_BACKOFF_MS = 30_000;
export const TASK_TIMEOUT_MS = 30_000;
export const POLL_INTERVAL_MS = 10_000;
export const TASKS_PER_TICK = 5;

/**
 * Pure, DB-free budget check. Handles the daily rollover itself so the
 * caller doesn't need a separate "reset" step: if `periodStart` isn't
 * today, the counters are treated as zero for this check.
 */
export function checkBudget(
  budget: Pick<
    AgentBudgetRow,
    "max_actions_per_day" | "actions_today" | "max_tokens_per_day" | "tokens_today" | "period_start"
  > | null,
  today: string // "YYYY-MM-DD"
): { allowed: boolean; reason?: string } {
  if (!budget) {
    return { allowed: true };
  }

  const actionsToday = budget.period_start === today ? budget.actions_today : 0;

  if (budget.max_actions_per_day !== null && actionsToday >= budget.max_actions_per_day) {
    return {
      allowed: false,
      reason: `Daily action budget exhausted (${actionsToday}/${budget.max_actions_per_day}).`,
    };
  }

  return { allowed: true };
}

/**
 * Decides what happens to a task after a failed dispatch attempt.
 * retryCount is the count *before* this failed attempt.
 */
export function decideAfterFailure(
  retryCount: number
): { outcome: "retry"; nextRetryCount: number; dueAt: Date } | { outcome: "escalate" } {
  const nextRetryCount = retryCount + 1;
  if (nextRetryCount >= MAX_ATTEMPTS) {
    return { outcome: "escalate" };
  }
  return {
    outcome: "retry",
    nextRetryCount,
    dueAt: new Date(Date.now() + RETRY_BACKOFF_MS),
  };
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
