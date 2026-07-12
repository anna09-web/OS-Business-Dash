import { LineChart } from "lucide-react";

import { ComingSoon } from "@/components/dashboard/coming-soon";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";

export default function TradingPage() {
  return (
    <div>
      <PageHeader
        title="Day Trading"
        description="Paper-first strategy execution with a hard-coded risk veto."
      />
      <div className="mb-4">
        <Badge variant="outline">Mode: paper (default — live requires manual gate)</Badge>
      </div>
      <ComingSoon
        icon={LineChart}
        phase="Phase 5 — Trading unit"
        items={[
          "Alpaca paper trading integration",
          "Strategy Runner Agent",
          "Risk Manager Agent — hard-coded veto power, non-overridable",
          "Live equity curve, open positions, and trade journal",
        ]}
      />
    </div>
  );
}
