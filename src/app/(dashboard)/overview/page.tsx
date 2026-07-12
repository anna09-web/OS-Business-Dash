import { Activity, Bot, DollarSign, ListChecks } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { LiveActivityFeed } from "@/components/dashboard/live-activity-feed";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function OverviewPage() {
  const supabase = await createClient();

  const [
    { count: pendingApprovals },
    { count: activeAgents },
    { data: recentLogs },
    { data: soldListings },
    { data: paidInvoices },
    { data: closedTrades },
  ] = await Promise.all([
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
    supabase.from("listings").select("sold_price").eq("status", "sold"),
    supabase.from("invoices").select("amount").eq("status", "paid"),
    supabase.from("trades").select("pnl, exit_at").eq("status", "closed"),
  ]);

  const totalRevenue =
    (soldListings ?? []).reduce((sum, l) => sum + (l.sold_price ?? 0), 0) +
    (paidInvoices ?? []).reduce((sum, i) => sum + i.amount, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPnl = (closedTrades ?? [])
    .filter((t) => t.exit_at && new Date(t.exit_at) >= today)
    .reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Cross-business snapshot. Reselling, Agency, and Trading each get their own dashboard."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total revenue" value={`£${totalRevenue.toFixed(2)}`} icon={DollarSign} />
        <KpiCard label="Active agents" value={String(activeAgents ?? 0)} icon={Bot} />
        <KpiCard
          label="Pending approvals"
          value={String(pendingApprovals ?? 0)}
          icon={ListChecks}
          accent={pendingApprovals ? "warning" : undefined}
        />
        <KpiCard
          label="Today's trading P/L"
          value={`£${todayPnl.toFixed(2)}`}
          icon={Activity}
          accent={todayPnl < 0 ? "destructive" : todayPnl > 0 ? "success" : undefined}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Agent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <LiveActivityFeed initialLogs={recentLogs ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
