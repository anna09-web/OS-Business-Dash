"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteTask, setTaskStatus } from "@/app/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Database, TaskStatus, UserRole } from "@/types/database";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

const PRIORITY_VARIANT = {
  low: "outline",
  medium: "secondary",
  high: "warning",
} as const;

export function TaskBoard({ tasks, role }: { tasks: Task[]; role: UserRole }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (tasks.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No tasks yet.
      </p>
    );
  }

  function onStatusChange(id: string, status: TaskStatus) {
    setPendingId(id);
    startTransition(async () => {
      try {
        await setTaskStatus(id, status);
      } finally {
        setPendingId(null);
      }
    });
  }

  function onDelete(id: string) {
    setPendingId(id);
    startTransition(async () => {
      try {
        await deleteTask(id);
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <ul className="divide-y divide-border">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center gap-3 py-2.5 text-sm">
          <span
            className={cn(
              "flex-1 truncate",
              task.status === "done" && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </span>
          {task.due_date && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
          <Badge variant={PRIORITY_VARIANT[task.priority]} className="capitalize">
            {task.priority}
          </Badge>
          {role === "owner" ? (
            <>
              <Select
                value={task.status}
                disabled={pendingId === task.id}
                onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                className="w-32"
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                disabled={pendingId === task.id}
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="text-muted-foreground" />
              </Button>
            </>
          ) : (
            <Badge variant="outline" className="w-32 justify-center capitalize">
              {task.status.replace("_", " ")}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
