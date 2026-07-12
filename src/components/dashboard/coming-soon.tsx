import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({
  icon: Icon,
  phase,
  items,
}: {
  icon: LucideIcon;
  phase: string;
  items: string[];
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 py-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium">{phase}</p>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
