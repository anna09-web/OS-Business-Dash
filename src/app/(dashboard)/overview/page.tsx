import { Activity, Bot, DollarSign, ListChecks } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function OverviewPage() {
  const supabase = await createClient();

  const [{ count: pendingApprovals }, { count: activeAgents }, { data: recentLogs }] =
    await Promise.all([
      supabase
        .from("approvals")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("tasks")
        .select("assigned_agent", { count: "exact", head: true })
        .eq("status", "in_progress"),
      supabase
        .from("agent_logs")
        .select("id, agent, unit, action, level, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Cross-business snapshot. Reselling, Agency, and Trading each get their own dashboard."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total revenue" value="—" icon={DollarSign} />
        <KpiCard label="Active agents" value={String(activeAgents ?? 0)} icon={Bot} />
        <KpiCard
          label="Pending approvals"
          value={String(pendingApprovals ?? 0)}
          icon={ListChecks}
          accent={pendingApprovals ? "warning" : undefined}
        />
        <KpiCard label="Today's P/L" value="—" icon={Activity} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Agent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs && recentLogs.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentLogs.map((log) => (
                <li key={log.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>
                    <span className="font-medium">{log.agent}</span>{" "}
                    <span className="text-muted-foreground">{log.action}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No agent activity yet — the Manager Agent and specialist agents
              are built in Phase 2.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
