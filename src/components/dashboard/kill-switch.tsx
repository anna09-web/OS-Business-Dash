"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";

import { setAgentsPaused } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";

export function KillSwitch({ initialPaused }: { initialPaused: boolean }) {
  const [paused, setPaused] = useState(initialPaused);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    const next = !paused;
    startTransition(async () => {
      try {
        await setAgentsPaused(next);
        setPaused(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="size-4 text-destructive" />
          <span>
            {paused
              ? "All agents are paused."
              : "Agents run normally. This immediately halts every unit, including trading."}
          </span>
        </div>
        <Button
          variant={paused ? "secondary" : "destructive"}
          size="sm"
          disabled={pending}
          onClick={toggle}
        >
          {paused ? "Resume agents" : "Pause all agents"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
