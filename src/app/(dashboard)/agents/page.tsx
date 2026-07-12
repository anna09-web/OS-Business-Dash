import { Bot } from "lucide-react";

import { ComingSoon } from "@/components/dashboard/coming-soon";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AgentsPage() {
  const supabase = await createClient();
  const { data: pendingApprovals } = await supabase
    .from("approvals")
    .select("id, unit, kind, title, requested_by, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Agents"
        description="Every agent's status, last action, approval queue, and budget usage."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Approval queue</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingApprovals && pendingApprovals.length > 0 ? (
            <ul className="divide-y divide-border">
              {pendingApprovals.map((approval) => (
                <li
                  key={approval.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span>
                    <span className="font-medium">{approval.title}</span>{" "}
                    <span className="text-muted-foreground">
                      · {approval.unit} · requested by {approval.requested_by}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(approval.created_at).toLocaleString()}
                  </span>
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

      <ComingSoon
        icon={Bot}
        phase="Phase 2 — Manager Agent"
        items={[
          "Task queue router with per-agent budget/rate-limit caps",
          "Manager Agent polling loop with retry-then-escalate handling",
          "Full agent status panel (idle/running/error) per specialist",
          "Global kill switch is already wired at the database level — the button above ties into it once the Manager Agent exists",
        ]}
      />
    </div>
  );
}
