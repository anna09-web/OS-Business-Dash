"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type LogRow = {
  id: string;
  agent: string;
  unit: string;
  action: string;
  level: string;
  created_at: string;
};

const MAX_ROWS = 10;

export function LiveActivityFeed({ initialLogs }: { initialLogs: LogRow[] }) {
  const [logs, setLogs] = useState(initialLogs);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("agent_logs-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_logs" },
        (payload) => {
          setLogs((prev) => [payload.new as LogRow, ...prev].slice(0, MAX_ROWS));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (logs.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No agent activity yet — run <code>npm run worker</code> and trigger an
        agent from the Reselling, Agency, or Trading page.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {logs.map((log) => (
        <li key={log.id} className="flex items-center justify-between py-2.5 text-sm">
          <span>
            <span className="font-medium">{log.agent}</span>{" "}
            <span className="text-muted-foreground">{log.action}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(log.created_at).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
