"use client";

import { useEffect, useState } from "react";
import { AlertOctagon } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type EscalatedTask = {
  id: string;
  unit: string;
  type: string;
  error: string | null;
  retry_count: number;
  updated_at: string;
};

export function LiveEscalatedTasks({ initialTasks }: { initialTasks: EscalatedTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("escalated-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: "status=eq.escalated" },
        (payload) => {
          const row = payload.new as EscalatedTask;
          setTasks((prev) => [row, ...prev.filter((t) => t.id !== row.id)].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (tasks.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No escalated tasks. The Manager Agent retries once before escalating a
        failed task here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-start gap-2 py-2.5 text-sm">
          <AlertOctagon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p>
              <span className="font-medium">
                {task.unit}:{task.type}
              </span>{" "}
              <span className="text-muted-foreground">· {task.retry_count} attempt(s)</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">{task.error}</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Date(task.updated_at).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
