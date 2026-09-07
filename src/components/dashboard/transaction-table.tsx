"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteTransaction } from "@/app/actions/transactions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Database, UserRole } from "@/types/database";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

export function TransactionTable({
  transactions,
  role,
}: {
  transactions: Transaction[];
  role: UserRole;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (transactions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No transactions recorded yet.
      </p>
    );
  }

  function onDelete(id: string) {
    setPendingId(id);
    startTransition(async () => {
      try {
        await deleteTransaction(id);
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <ul className="divide-y divide-border">
      {transactions.map((tx) => (
        <li key={tx.id} className="flex items-center gap-3 py-2.5 text-sm">
          <Badge variant={tx.type === "income" ? "success" : "destructive"} className="capitalize">
            {tx.type}
          </Badge>
          <span className="flex-1 truncate">
            <span className="font-medium">{tx.category}</span>
            {tx.description && (
              <span className="text-muted-foreground"> · {tx.description}</span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(tx.occurred_on).toLocaleDateString()}
          </span>
          <span
            className={cn(
              "w-24 shrink-0 text-right font-medium tabular-nums",
              tx.type === "income" ? "text-success" : "text-destructive"
            )}
          >
            {tx.type === "income" ? "+" : "-"}
            {formatCurrency(tx.amount)}
          </span>
          {role === "owner" && (
            <Button
              variant="ghost"
              size="icon"
              disabled={pendingId === tx.id}
              onClick={() => onDelete(tx.id)}
            >
              <Trash2 className="text-muted-foreground" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
