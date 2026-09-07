"use client";

import { useEffect, useState } from "react";

function timeLeft(target: Date) {
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return null;

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return { days, hours, minutes };
}

export function AreaCountdown({ unlockAt }: { unlockAt: string }) {
  const [remaining, setRemaining] = useState(() => timeLeft(new Date(unlockAt)));

  useEffect(() => {
    const target = new Date(unlockAt);
    const id = setInterval(() => setRemaining(timeLeft(target)), 60_000);
    return () => clearInterval(id);
  }, [unlockAt]);

  if (!remaining) {
    return <p className="text-sm text-muted-foreground">Wird beim nächsten Laden freigeschaltet.</p>;
  }

  return (
    <div className="flex items-baseline gap-4 tabular-nums">
      <div className="flex flex-col items-center">
        <span className="text-2xl font-semibold">{remaining.days}</span>
        <span className="text-xs text-muted-foreground">Tage</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-2xl font-semibold">{remaining.hours}</span>
        <span className="text-xs text-muted-foreground">Std.</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-2xl font-semibold">{remaining.minutes}</span>
        <span className="text-xs text-muted-foreground">Min.</span>
      </div>
    </div>
  );
}
