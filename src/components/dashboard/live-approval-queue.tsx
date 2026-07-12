"use client";

import { useEffect, useState } from "react";

import { ApprovalActions, ApprovalDiff } from "@/components/dashboard/approval-actions";
import { createClient } from "@/lib/supabase/client";

type Approval = {
  id: string;
  unit: string;
  kind: string;
  title: string;
  requested_by: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  status: string;
  created_at: string;
};

export function LiveApprovalQueue({
  initialApprovals,
  isOwner,
}: {
  initialApprovals: Approval[];
  isOwner: boolean;
}) {
  const [approvals, setApprovals] = useState(initialApprovals);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("approvals-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "approvals" },
        (payload) => {
          const row = payload.new as Approval | undefined;

          if (payload.eventType === "INSERT" && row?.status === "pending") {
            setApprovals((prev) => [row, ...prev]);
            return;
          }

          if (payload.eventType === "UPDATE") {
            setApprovals((prev) => {
              if (!row || row.status !== "pending") {
                return prev.filter((a) => a.id !== (row?.id ?? (payload.old as Approval)?.id));
              }
              return prev.map((a) => (a.id === row.id ? row : a));
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (approvals.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nothing waiting on you right now.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {approvals.map((approval) => (
        <li key={approval.id} className="flex items-start justify-between gap-3 py-3 text-sm">
          <div className="min-w-0 flex-1">
            <p>
              <span className="font-medium">{approval.title}</span>{" "}
              <span className="text-muted-foreground">
                · {approval.unit} · requested by {approval.requested_by} ·{" "}
                {new Date(approval.created_at).toLocaleString()}
              </span>
            </p>
            <ApprovalDiff before={approval.before} after={approval.after} />
          </div>
          {isOwner && <ApprovalActions approvalId={approval.id} />}
        </li>
      ))}
    </ul>
  );
}
