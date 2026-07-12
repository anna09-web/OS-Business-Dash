import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../types/database";
import {
  MAX_ATTEMPTS,
  POLL_INTERVAL_MS,
  TASK_TIMEOUT_MS,
  TASKS_PER_TICK,
  checkBudget,
  decideAfterFailure,
  isoDate,
  type TaskRow,
} from "./logic";
import { resolveHandler } from "./registry";
import { createServiceClient } from "./supabase-service-client";

type Client = SupabaseClient<Database>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function logAction(
  supabase: Client,
  entry: {
    agent: string;
    unit: TaskRow["unit"];
    task_id?: string;
    action: string;
    level?: "info" | "warn" | "error";
    detail?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("agent_logs").insert({
    agent: entry.agent,
    unit: entry.unit,
    task_id: entry.task_id ?? null,
    action: entry.action,
    level: entry.level ?? "info",
    detail: entry.detail ?? {},
  });
  if (error) {
    console.error("[manager-agent] failed to write audit log:", error.message);
  }
}

async function isPaused(supabase: Client): Promise<boolean> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("agents_paused")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("[manager-agent] failed to read system_settings, assuming paused:", error.message);
    return true; // fail closed
  }
  return data.agents_paused;
}

async function fetchPendingTasks(supabase: Client): Promise<TaskRow[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "pending")
    .or(`due_at.is.null,due_at.lte.${nowIso}`)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(TASKS_PER_TICK);

  if (error) {
    console.error("[manager-agent] failed to fetch pending tasks:", error.message);
    return [];
  }
  return data ?? [];
}

async function escalate(supabase: Client, task: TaskRow, reason: string, action: string) {
  await supabase
    .from("tasks")
    .update({ status: "escalated", error: reason, updated_at: new Date().toISOString() })
    .eq("id", task.id);

  await logAction(supabase, {
    agent: "manager",
    unit: task.unit,
    task_id: task.id,
    action,
    level: "error",
    detail: { reason },
  });
}

async function recordAgentSuccess(supabase: Client, agent: string) {
  const today = isoDate(new Date());
  const { data: budget } = await supabase
    .from("agent_budgets")
    .select("*")
    .eq("agent", agent)
    .maybeSingle();

  if (!budget) return; // uncapped / not yet configured

  const actionsToday = budget.period_start === today ? budget.actions_today + 1 : 1;

  await supabase
    .from("agent_budgets")
    .update({ actions_today: actionsToday, period_start: today, updated_at: new Date().toISOString() })
    .eq("agent", agent);
}

async function processTask(supabase: Client, task: TaskRow) {
  const entry = resolveHandler(task.unit, task.type);

  if (!entry) {
    await escalate(
      supabase,
      task,
      `No agent registered for "${task.unit}:${task.type}" yet.`,
      "task_escalated_no_agent"
    );
    return;
  }

  const today = isoDate(new Date());
  const { data: budget } = await supabase
    .from("agent_budgets")
    .select("*")
    .eq("agent", entry.agent)
    .maybeSingle();

  const budgetCheck = checkBudget(budget, today);
  if (!budgetCheck.allowed) {
    await escalate(supabase, task, budgetCheck.reason!, "task_escalated_budget");
    return;
  }

  await supabase
    .from("tasks")
    .update({
      status: "in_progress",
      assigned_agent: entry.agent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", task.id);

  await logAction(supabase, {
    agent: entry.agent,
    unit: task.unit,
    task_id: task.id,
    action: "task_dispatched",
  });

  try {
    const result = await withTimeout(entry.handler(task, supabase), TASK_TIMEOUT_MS);

    await supabase
      .from("tasks")
      .update({ status: "completed", result, updated_at: new Date().toISOString() })
      .eq("id", task.id);

    await logAction(supabase, {
      agent: entry.agent,
      unit: task.unit,
      task_id: task.id,
      action: "task_completed",
    });

    await recordAgentSuccess(supabase, entry.agent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const decision = decideAfterFailure(task.retry_count);

    if (decision.outcome === "escalate") {
      await escalate(
        supabase,
        task,
        `Failed after ${MAX_ATTEMPTS} attempt(s): ${message}`,
        "task_failed_escalated"
      );
      return;
    }

    await supabase
      .from("tasks")
      .update({
        status: "pending",
        retry_count: decision.nextRetryCount,
        due_at: decision.dueAt.toISOString(),
        error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    await logAction(supabase, {
      agent: entry.agent,
      unit: task.unit,
      task_id: task.id,
      action: "task_failed_retrying",
      level: "warn",
      detail: { message, retryCount: decision.nextRetryCount },
    });
  }
}

async function tick(supabase: Client) {
  if (await isPaused(supabase)) {
    return;
  }

  const tasks = await fetchPendingTasks(supabase);
  for (const task of tasks) {
    // Re-check the kill switch before each task: the whole point of the
    // switch is that it works even mid-batch, not just between ticks.
    if (await isPaused(supabase)) {
      return;
    }
    await processTask(supabase, task);
  }
}

async function main() {
  const supabase = createServiceClient();
  let running = true;

  const shutdown = () => {
    console.log("[manager-agent] shutting down…");
    running = false;
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(`[manager-agent] polling every ${POLL_INTERVAL_MS}ms`);

  while (running) {
    try {
      await tick(supabase);
    } catch (err) {
      console.error("[manager-agent] tick failed:", err);
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

main().catch((err) => {
  console.error("[manager-agent] fatal error:", err);
  process.exit(1);
});
