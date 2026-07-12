import type { TaskRow } from "./logic";

export type TaskHandler = (task: TaskRow) => Promise<Record<string, unknown>>;

export interface RegistryEntry {
  agent: string;
  handler: TaskHandler;
}

/**
 * Rule-based routing table: `${unit}:${type}` -> the specialist agent that
 * owns it. Task `type` is chosen by whoever creates the task, so routing is
 * deterministic by construction — no LLM-based routing is needed here.
 *
 * Phases 3-5 register their real specialist agents (Lister, Repricer,
 * Outreach, Strategy Runner, ...) by adding entries to this map. Until then,
 * any task whose `unit:type` isn't listed here gets escalated by the
 * Manager Agent with "no agent registered for this task type yet".
 */
export const REGISTRY: Record<string, RegistryEntry> = {
  "manager:health_check": {
    agent: "manager",
    handler: async () => ({ ok: true, checkedAt: new Date().toISOString() }),
  },
};

export function resolveHandler(unit: string, type: string): RegistryEntry | undefined {
  return REGISTRY[`${unit}:${type}`];
}
