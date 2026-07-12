"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";

import { decideApproval } from "@/app/actions/approvals";
import { Button } from "@/components/ui/button";

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "—";
  return String(value);
}

export function ApprovalDiff({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  if (!after) return null;
  const keys = Object.keys(after).filter((k) => !k.endsWith("_id"));

  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      {keys.map((key) => (
        <div key={key} className="contents">
          <dt className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</dt>
          <dd className="truncate">
            {before && key in before ? (
              <>
                <span className="text-muted-foreground line-through">
                  {formatValue(before[key])}
                </span>{" "}
                → {formatValue(after[key])}
              </>
            ) : (
              formatValue(after[key])
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ApprovalActions({ approvalId }: { approvalId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [decided, setDecided] = useState<"approved" | "rejected" | null>(null);

  function decide(decision: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      try {
        await decideApproval(approvalId, decision);
        setDecided(decision);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to record decision.");
      }
    });
  }

  if (decided) {
    return (
      <span className="text-xs text-muted-foreground capitalize">{decided}</span>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button size="icon" variant="outline" disabled={pending} onClick={() => decide("approved")}>
        <Check className="size-4 text-success" />
      </Button>
      <Button size="icon" variant="outline" disabled={pending} onClick={() => decide("rejected")}>
        <X className="size-4 text-destructive" />
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
