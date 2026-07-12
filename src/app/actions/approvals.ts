"use server";

import { revalidatePath } from "next/cache";

import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Approval = Database["public"]["Tables"]["approvals"]["Row"];
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function applyApproval(supabase: SupabaseServerClient, approval: Approval) {
  const after = approval.after as Record<string, unknown> | null;
  if (!after) return;

  const now = new Date().toISOString();

  switch (approval.kind) {
    case "listing_draft": {
      const { listing_id, title, description, category, keywords, suggested_price } = after as {
        listing_id: string;
        title: string;
        description: string;
        category: string;
        keywords: string[];
        suggested_price: number;
      };
      await supabase
        .from("listings")
        .update({
          title,
          description,
          category,
          keywords,
          list_price: suggested_price,
          status: "draft",
          updated_at: now,
        })
        .eq("id", listing_id);
      break;
    }
    case "reprice_suggestion": {
      const { listing_id, new_price } = after as { listing_id: string; new_price: number };
      await supabase
        .from("listings")
        .update({ list_price: new_price, updated_at: now })
        .eq("id", listing_id);
      break;
    }
    case "buyer_reply_draft": {
      const { buyer_message_id, draft_reply, is_negative } = after as {
        buyer_message_id: string;
        draft_reply: string;
        is_negative: boolean;
      };
      await supabase
        .from("buyer_messages")
        .update({ draft_reply, is_negative, status: "drafted", updated_at: now })
        .eq("id", buyer_message_id);
      break;
    }
    case "outreach_draft": {
      const { outreach_message_id, subject, body } = after as {
        outreach_message_id: string;
        subject: string;
        body: string;
      };
      await supabase
        .from("outreach_messages")
        .update({ subject, draft_body: body, status: "drafted", updated_at: now })
        .eq("id", outreach_message_id);
      break;
    }
    case "deliverable_draft": {
      const { deliverable_id, content } = after as { deliverable_id: string; content: string };
      await supabase
        .from("deliverables")
        .update({ draft_content: content, status: "drafted", updated_at: now })
        .eq("id", deliverable_id);
      break;
    }
    case "qa_report": {
      const { deliverable_id, summary, issues, suggestions } = after as {
        deliverable_id: string;
        summary: string;
        issues: string[];
        suggestions: string[];
      };
      const notes = [
        `Summary: ${summary}`,
        issues.length ? `Issues:\n${issues.map((i) => `- ${i}`).join("\n")}` : "No issues found.",
        suggestions.length ? `Suggestions:\n${suggestions.map((s) => `- ${s}`).join("\n")}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");
      await supabase
        .from("deliverables")
        .update({ qa_notes: notes, updated_at: now })
        .eq("id", deliverable_id);
      break;
    }
    case "invoice_reminder_draft": {
      const { invoice_id, reminder } = after as { invoice_id: string; reminder: string };
      await supabase
        .from("invoices")
        .update({ reminder_draft: reminder, updated_at: now })
        .eq("id", invoice_id);
      break;
    }
    default:
      // Unknown kind: nothing to apply automatically. The decision is still
      // recorded, but a human should follow up manually.
      break;
  }
}

export async function decideApproval(approvalId: string, decision: "approved" | "rejected") {
  const profile = await getProfile();
  if (profile.role !== "owner") {
    throw new Error("Only the owner can approve or reject.");
  }

  const supabase = await createClient();

  const { data: approval, error } = await supabase
    .from("approvals")
    .select("*")
    .eq("id", approvalId)
    .single();

  if (error || !approval) {
    throw new Error("Approval not found.");
  }
  if (approval.status !== "pending") {
    throw new Error("This approval has already been decided.");
  }

  if (decision === "approved") {
    await applyApproval(supabase, approval);
  }

  const { error: updateError } = await supabase
    .from("approvals")
    .update({ status: decision, decided_by: profile.id, decided_at: new Date().toISOString() })
    .eq("id", approvalId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await supabase.from("agent_logs").insert({
    agent: "owner",
    unit: approval.unit,
    task_id: approval.task_id,
    action: decision === "approved" ? "approval_approved" : "approval_rejected",
    detail: { approval_id: approvalId, kind: approval.kind, by: profile.email },
  });

  revalidatePath("/agents");
  revalidatePath("/reselling");
  revalidatePath("/agency");
  revalidatePath("/overview");
}
