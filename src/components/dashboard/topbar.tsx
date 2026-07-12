import { AlertTriangle } from "lucide-react";

import { PendingApprovalsBadge } from "@/components/dashboard/pending-approvals-badge";
import { UserMenu } from "@/components/dashboard/user-menu";
import { Badge } from "@/components/ui/badge";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export async function Topbar() {
  const profile = await getProfile();
  const supabase = await createClient();
  const [{ data: settings }, { count: pendingApprovals }] = await Promise.all([
    supabase.from("system_settings").select("agents_paused, trading_mode").eq("id", 1).single(),
    supabase.from("approvals").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border px-6">
      <div className="flex items-center gap-2">
        {settings?.agents_paused && (
          <Badge variant="destructive" className="gap-1.5">
            <AlertTriangle className="size-3" />
            All agents paused
          </Badge>
        )}
        <Badge variant="outline" className="uppercase tracking-wide">
          Trading mode: {settings?.trading_mode ?? "paper"}
        </Badge>
        <PendingApprovalsBadge initialCount={pendingApprovals ?? 0} />
      </div>

      <UserMenu email={profile.email} role={profile.role} />
    </header>
  );
}
