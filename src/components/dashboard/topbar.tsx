import { AlertTriangle } from "lucide-react";

import { UserMenu } from "@/components/dashboard/user-menu";
import { Badge } from "@/components/ui/badge";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export async function Topbar() {
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("system_settings")
    .select("automations_paused")
    .eq("id", 1)
    .single();

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border px-6">
      <div className="flex items-center gap-2">
        {settings?.automations_paused && (
          <Badge variant="destructive" className="gap-1.5">
            <AlertTriangle className="size-3" />
            Automations paused
          </Badge>
        )}
      </div>

      <UserMenu email={profile.email} role={profile.role} />
    </header>
  );
}
