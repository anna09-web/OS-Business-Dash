import { DollarSign, ListChecks, TrendingDown, TrendingUp } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: transactions }, { count: openTasks }, { data: recentTasks }] = await Promise.all([
    supabase.from("transactions").select("type, amount, category, occurred_on"),
    supabase.from("tasks").select("*", { count: "exact", head: true }).neq("status", "done"),
    supabase
      .from("tasks")
      .select("id, title, status, priority")
      .neq("status", "done")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalRevenue = (transactions ?? [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = (transactions ?? [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const recentTransactions = (transactions ?? [])
    .slice()
    .sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : -1))
    .slice(0, 5);

  return (
    <div>
      <PageHeader title="Dashboard" description="Your business at a glance." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total revenue" value={formatCurrency(totalRevenue)} icon={TrendingUp} accent="success" />
        <KpiCard label="Total expenses" value={formatCurrency(totalExpenses)} icon={TrendingDown} accent="destructive" />
        <KpiCard
          label="Net profit"
          value={formatCurrency(netProfit)}
          icon={DollarSign}
          accent={netProfit >= 0 ? "success" : "destructive"}
        />
        <KpiCard label="Open tasks" value={String(openTasks ?? 0)} icon={ListChecks} />
      </div>

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
                      {formatCurrency(tx.amount)}
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
