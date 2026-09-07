import { AddTransactionForm } from "@/components/dashboard/add-transaction-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { TransactionTable } from "@/components/dashboard/transaction-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export default async function FinancesPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .order("occurred_on", { ascending: false });

  return (
    <div>
      <PageHeader title="Finances" description="Income and expenses across the business." />

      {profile.role === "owner" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Record a transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <AddTransactionForm />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionTable transactions={transactions ?? []} role={profile.role} />
        </CardContent>
      </Card>
    </div>
  );
}
