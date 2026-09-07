import { AutomationsToggle } from "@/components/dashboard/automations-toggle";
import { MfaEnrollment } from "@/components/dashboard/mfa-enrollment";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("system_settings")
    .select("automations_paused")
    .eq("id", 1)
    .single();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title="Settings" />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm">
          <span>{profile.email}</span>
          <Badge variant={profile.role === "owner" ? "default" : "secondary"} className="capitalize">
            {profile.role}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <MfaEnrollment />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automations</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.role === "owner" ? (
            <AutomationsToggle initialPaused={settings?.automations_paused ?? false} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {settings?.automations_paused
                ? "All automations are currently paused by the owner."
                : "Automations are running normally."}{" "}
              Only the owner can use the kill switch.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
