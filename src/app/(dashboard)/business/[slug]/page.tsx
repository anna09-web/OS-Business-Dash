import { notFound } from "next/navigation";
import { DollarSign, ListChecks, TrendingDown, TrendingUp } from "lucide-react";

import { AddTaskForm } from "@/components/dashboard/add-task-form";
import { AddTransactionForm } from "@/components/dashboard/add-transaction-form";
import { AreaLockScreen } from "@/components/dashboard/area-lock-screen";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { TaskBoard } from "@/components/dashboard/task-board";
import { TransactionTable } from "@/components/dashboard/transaction-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/lib/auth/dal";
import { BUSINESS_AREA_META, isAreaUnlocked } from "@/lib/business-areas";
import { formatEUR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { BusinessAreaSlug } from "@/types/database";

export default async function BusinessAreaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const meta = BUSINESS_AREA_META[rawSlug as BusinessAreaSlug];
  if (!meta) {
    notFound();
  }
  const slug = rawSlug as BusinessAreaSlug;

  const profile = await getProfile();
  const supabase = await createClient();

  const { data: area } = await supabase
    .from("business_areas")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!area) {
    notFound();
  }

  const unlocked = isAreaUnlocked(area);

  if (!unlocked) {
    let revenueProgress: { current: number; goal: number } | undefined;

    if (!area.unlock_at) {
      const [{ data: dropshippingIncome }, { data: settings }] = await Promise.all([
        supabase
          .from("transactions")
          .select("amount")
          .eq("business_area", "dropshipping")
          .eq("type", "income"),
        supabase.from("system_settings").select("revenue_goal").eq("id", 1).single(),
      ]);
      revenueProgress = {
        current: (dropshippingIncome ?? []).reduce((sum, t) => sum + t.amount, 0),
        goal: settings?.revenue_goal ?? 500000,
      };
    }

    return (
      <div>
        <PageHeader title={area.name} description={meta.tagline} />
        <AreaLockScreen area={area} meta={meta} role={profile.role} revenueProgress={revenueProgress} />
      </div>
    );
  }

  const [{ data: transactions }, { data: tasks }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("business_area", slug)
      .order("occurred_on", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("business_area", slug)
      .order("created_at", { ascending: false }),
  ]);

  const revenue = (transactions ?? [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = (transactions ?? [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const openTasks = (tasks ?? []).filter((t) => t.status !== "done").length;

  return (
    <div>
      <PageHeader title={area.name} description={meta.tagline} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Umsatz" value={formatEUR(revenue)} icon={TrendingUp} accent="success" />
        <KpiCard label="Ausgaben" value={formatEUR(expenses)} icon={TrendingDown} accent="destructive" />
        <KpiCard
          label="Gewinn"
          value={formatEUR(revenue - expenses)}
          icon={DollarSign}
          accent={revenue - expenses >= 0 ? "success" : "destructive"}
        />
        <KpiCard label="Offene Aufgaben" value={String(openTasks)} icon={ListChecks} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Finanzen</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {profile.role === "owner" && (
              <AddTransactionForm businessArea={area.slug} />
            )}
            <TransactionTable transactions={transactions ?? []} role={profile.role} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aufgaben</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {profile.role === "owner" && <AddTaskForm businessArea={area.slug} />}
            <TaskBoard tasks={tasks ?? []} role={profile.role} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
