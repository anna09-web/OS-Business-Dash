"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { createTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { BusinessAreaSlug } from "@/types/database";

export function AddTaskForm({ businessArea }: { businessArea?: BusinessAreaSlug }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createTask(formData);
        formRef.current?.reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create task.");
      }
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      {businessArea && <input type="hidden" name="business_area" value={businessArea} />}
      <div className="flex-1">
        <Input name="title" placeholder="New task…" required disabled={pending} />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <Select name="priority" defaultValue="medium" className="sm:w-32" disabled={pending}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </Select>
      <Input type="date" name="due_date" className="sm:w-40" disabled={pending} />
      <Button type="submit" size="default" disabled={pending}>
        <Plus />
        Add
      </Button>
    </form>
  );
}
