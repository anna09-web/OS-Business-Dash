import Link from "next/link";
import { DollarSign, Lock, ListChecks, TrendingDown, TrendingUp } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BUSINESS_AREA_META, isAreaUnlocked } from "@/lib/business-areas";
import { formatEUR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: transactions }, { count: openTasks }, { data: recentTasks }, { data: areas }, { data: settings }] =
    await Promise.all([
      supabase.from("transactions").select("type, amount, category, occurred_on, business_area"),
      supabase.from("tasks").select("*", { count: "exact", head: true }).neq("status", "done"),
      supabase
        .from("tasks")
        .select("id, title, status, priority")
        .neq("status", "done")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("business_areas").select("*").order("sort_order", { ascending: true }),
      supabase.from("system_settings").select("revenue_goal").eq("id", 1).single(),
    ]);

  const totalRevenue = (transactions ?? [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = (transactions ?? [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const dropshippingRevenue = (transactions ?? [])
    .filter((t) => t.type === "income" && t.business_area === "dropshipping")
    .reduce((sum, t) => sum + t.amount, 0);
  const revenueGoal = settings?.revenue_goal ?? 500000;

  const recentTransactions = (transactions ?? [])
    .slice()
    .sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : -1))
    .slice(0, 5);

  return (
    <div>
      <PageHeader title="Dashboard" description="Your business at a glance." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total revenue" value={formatEUR(totalRevenue)} icon={TrendingUp} accent="success" />
        <KpiCard label="Total expenses" value={formatEUR(totalExpenses)} icon={TrendingDown} accent="destructive" />
        <KpiCard
          label="Net profit"
          value={formatEUR(netProfit)}
          icon={DollarSign}
          accent={netProfit >= 0 ? "success" : "destructive"}
        />
        <KpiCard label="Open tasks" value={String(openTasks ?? 0)} icon={ListChecks} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Dropshipping → nächste Stufe</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Umsatz auf dem Weg zu 500.000 €</span>
            <span className="font-medium tabular-nums">
              {formatEUR(dropshippingRevenue)} / {formatEUR(revenueGoal)}
            </span>
          </div>
          <ProgressBar value={dropshippingRevenue} max={revenueGoal} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Business-Bereiche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(areas ?? []).map((area) => {
              const unlocked = isAreaUnlocked(area);
              const Icon = BUSINESS_AREA_META[area.slug]?.icon ?? Lock;
              return (
                <Link
                  key={area.slug}
                  href={`/business/${area.slug}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:bg-accent"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{area.name}</span>
                  </span>
                  <Badge variant={unlocked ? "success" : "outline"} className="shrink-0 gap-1">
                    {!unlocked && <Lock className="size-3" />}
                    {unlocked ? "Freigeschaltet" : "Gesperrt"}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <ul className="divide-y divide-border">
                {recentTransactions.map((tx, i) => (
                  <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                    <span>{tx.category}</span>
                    <span
                      className={tx.type === "income" ? "text-success" : "text-destructive"}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatEUR(tx.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No transactions recorded yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasks && recentTasks.length > 0 ? (
              <ul className="divide-y divide-border">
                {recentTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span>{task.title}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {task.status.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing on your plate right now.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
