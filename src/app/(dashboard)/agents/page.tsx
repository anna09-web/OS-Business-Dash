import { AlertOctagon } from "lucide-react";

import { ApprovalActions, ApprovalDiff } from "@/components/dashboard/approval-actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { REGISTRY } from "@/worker/registry";

export default async function AgentsPage() {
  const profile = await getProfile();
  const supabase = await createClient();

  const [
    { data: pendingApprovals },
    { data: escalatedTasks },
    { data: budgets },
    { data: activeTasks },
    { data: recentLogs },
  ] = await Promise.all([
    supabase
      .from("approvals")
      .select("id, unit, kind, title, requested_by, before, after, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, unit, type, error, retry_count, updated_at")
      .eq("status", "escalated")
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase.from("agent_budgets").select("*"),
    supabase.from("tasks").select("assigned_agent").eq("status", "in_progress"),
    supabase
      .from("agent_logs")
      .select("agent, action, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const knownAgents = [...new Set(Object.values(REGISTRY).map((e) => e.agent))];
  const runningAgents = new Set((activeTasks ?? []).map((t) => t.assigned_agent));
  const lastActionByAgent = new Map<string, { action: string; created_at: string }>();
  for (const log of recentLogs ?? []) {
    if (!lastActionByAgent.has(log.agent)) {
      lastActionByAgent.set(log.agent, log);
    }
  }
  const budgetByAgent = new Map((budgets ?? []).map((b) => [b.agent, b]));

  return (
    <div>
      <PageHeader
        title="Agents"
        description="Every agent's status, last action, approval queue, and budget usage."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Agent status</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {knownAgents.map((agent) => {
              const running = runningAgents.has(agent);
              const lastAction = lastActionByAgent.get(agent);
              const budget = budgetByAgent.get(agent);
              return (
                <li key={agent} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={running ? "success" : "secondary"} className="capitalize">
                      {running ? "running" : "idle"}
                    </Badge>
                    <span className="font-medium">{agent}</span>
                    {lastAction && (
                      <span className="text-muted-foreground">
                        · last: {lastAction.action}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {budget
                      ? `${budget.actions_today}/${budget.max_actions_per_day ?? "∞"} actions today`
                      : "uncapped"}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Approval queue</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingApprovals && pendingApprovals.length > 0 ? (
            <ul className="divide-y divide-border">
              {pendingApprovals.map((approval) => (
                <li key={approval.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="font-medium">{approval.title}</span>{" "}
                      <span className="text-muted-foreground">
                        · {approval.unit} · requested by {approval.requested_by} ·{" "}
                        {new Date(approval.created_at).toLocaleString()}
                      </span>
                    </p>
                    <ApprovalDiff before={approval.before} after={approval.after} />
                  </div>
                  {profile.role === "owner" && <ApprovalActions approvalId={approval.id} />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing waiting on you right now.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Escalated tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {escalatedTasks && escalatedTasks.length > 0 ? (
            <ul className="divide-y divide-border">
              {escalatedTasks.map((task) => (
                <li key={task.id} className="flex items-start gap-2 py-2.5 text-sm">
                  <AlertOctagon className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="font-medium">
                        {task.unit}:{task.type}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        · {task.retry_count} attempt(s)
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{task.error}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(task.updated_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No escalated tasks. The Manager Agent retries once before
              escalating a failed task here.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        {knownAgents.length} agents registered across Reselling, Agency, and Trading. Phase 6
        (notifications, forecasting, reporting polish) is next — everything above is live.
      </p>
    </div>
  );
}
