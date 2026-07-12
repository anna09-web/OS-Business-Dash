import { Package } from "lucide-react";

import { ComingSoon } from "@/components/dashboard/coming-soon";
import { PageHeader } from "@/components/dashboard/page-header";

export default function ResellingPage() {
  return (
    <div>
      <PageHeader
        title="Reselling"
        description="Vinted &amp; Depop inventory, listings, sourcing, and fulfillment."
      />
      <ComingSoon
        icon={Package}
        phase="Phase 3 — Reselling unit"
        items={[
          "Inventory table (Vinted/Depop don't offer seller APIs, so sync will be manual/CSV-based rather than live)",
          "Lister Agent — drafts listings for one-click approval",
          "Repricer Agent — bounded by min-margin/max-discount rules",
          "Fulfillment tracker and profit/loss by SKU",
        ]}
      />
    </div>
  );
}
