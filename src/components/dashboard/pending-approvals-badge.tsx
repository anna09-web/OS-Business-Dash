"use client";

import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

export function PendingApprovalsBadge({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("approvals-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "approvals" },
        (payload) => {
          if ((payload.new as { status: string }).status === "pending") {
            setCount((c) => c + 1);
          }
        }
      )
      // Approvals are only ever updated by deciding them (pending -> approved
      // or rejected) — so any update means one fewer pending, no need to
      // inspect the row.
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "approvals" }, () => {
        setCount((c) => Math.max(0, c - 1));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (count === 0) return null;

  return (
    <Badge variant="warning" className="gap-1.5">
      <ListChecks className="size-3" />
      {count} pending approval{count === 1 ? "" : "s"}
    </Badge>
  );
}
