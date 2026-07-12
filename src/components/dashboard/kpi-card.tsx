import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: "success" | "warning" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <CardTitle>{label}</CardTitle>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
            accent === "success" && "bg-success/15 text-success",
            accent === "warning" && "bg-warning/15 text-warning",
            accent === "destructive" && "bg-destructive/15 text-destructive"
          )}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
