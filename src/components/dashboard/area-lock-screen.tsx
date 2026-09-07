import { Lock } from "lucide-react";

import { AreaCountdown } from "@/components/dashboard/area-countdown";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { UnlockAreaButton } from "@/components/dashboard/unlock-area-button";
import { Card, CardContent } from "@/components/ui/card";
import type { BusinessArea, BusinessAreaMeta } from "@/lib/business-areas";
import { formatBerlinDate, formatEUR } from "@/lib/format";
import type { UserRole } from "@/types/database";

export function AreaLockScreen({
  area,
  meta,
  role,
  revenueProgress,
}: {
  area: BusinessArea;
  meta: BusinessAreaMeta;
  role: UserRole;
  revenueProgress?: { current: number; goal: number };
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-5 py-4">
        <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Lock className="size-6" />
        </div>

        <div>
          <p className="text-sm font-medium">Noch gesperrt</p>
          <p className="mt-1 text-sm text-muted-foreground">{meta.unlockDescription}</p>
        </div>

        {area.unlock_at ? (
          <div className="flex flex-col gap-2">
            <AreaCountdown unlockAt={area.unlock_at} />
            <p className="text-xs text-muted-foreground">
              Freischaltung: {formatBerlinDate(area.unlock_at, { dateStyle: "full" })} (Europe/Berlin)
            </p>
          </div>
        ) : (
          <div className="w-full max-w-md">
            {revenueProgress && (
              <div className="mb-4 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dropshipping-Umsatz</span>
                  <span className="font-medium tabular-nums">
                    {formatEUR(revenueProgress.current)} / {formatEUR(revenueProgress.goal)}
                  </span>
                </div>
                <ProgressBar value={revenueProgress.current} max={revenueProgress.goal} />
              </div>
            )}
            {role === "owner" && <UnlockAreaButton slug={area.slug} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
