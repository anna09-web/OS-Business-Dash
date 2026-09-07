"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { createTransaction } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { BusinessAreaSlug } from "@/types/database";

export function AddTransactionForm({ businessArea }: { businessArea?: BusinessAreaSlug }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createTransaction(formData);
        formRef.current?.reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to record transaction.");
      }
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="flex flex-col gap-2">
      {businessArea && <input type="hidden" name="business_area" value={businessArea} />}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select name="type" defaultValue="income" className="sm:w-32" disabled={pending}>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </Select>
        <Input name="category" placeholder="Category (e.g. Sales)" required disabled={pending} />
        <Input
          type="number"
          name="amount"
          placeholder="Amount"
          step="0.01"
          min="0"
          required
          disabled={pending}
          className="sm:w-32"
        />
        <Input type="date" name="occurred_on" className="sm:w-40" disabled={pending} />
        <Button type="submit" disabled={pending}>
          <Plus />
          Add
        </Button>
      </div>
      <Input name="description" placeholder="Description (optional)" disabled={pending} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
