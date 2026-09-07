"use client";

import { useState, useTransition } from "react";
import { LockOpen } from "lucide-react";

import { unlockBusinessArea } from "@/app/actions/business-areas";
import { Button } from "@/components/ui/button";
import type { BusinessAreaSlug } from "@/types/database";

export function UnlockAreaButton({ slug }: { slug: BusinessAreaSlug }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onUnlock() {
    setError(null);
    startTransition(async () => {
      try {
        await unlockBusinessArea(slug);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to unlock.");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={onUnlock} disabled={pending}>
        <LockOpen />
        Jetzt freischalten
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
