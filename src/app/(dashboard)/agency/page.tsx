import { Briefcase } from "lucide-react";

import { ComingSoon } from "@/components/dashboard/coming-soon";
import { PageHeader } from "@/components/dashboard/page-header";

export default function AgencyPage() {
  return (
    <div>
      <PageHeader
        title="AI Agency"
        description="Client pipeline and deliverable agents."
      />
      <ComingSoon
        icon={Briefcase}
        phase="Phase 4 — Agency unit"
        items={[
          "Client roster and Kanban pipeline (lead → proposal → active → delivered → billed)",
          "Outreach and Content Agents — draft into an approval queue",
          "Dev/QA Agent — sandboxed code execution, opens PRs for review",
          "Billing Agent and per-client cost/margin tracking",
        ]}
      />
    </div>
  );
}
