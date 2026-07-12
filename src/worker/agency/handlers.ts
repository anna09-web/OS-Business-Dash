import type { TaskRow } from "../logic";
import type { RegistryEntry, ServiceClient } from "../registry";
import { draftOutreachMessage } from "./outreach-agent";
import { draftDeliverable } from "./content-agent";
import { reviewDeliverable } from "./qa-agent";
import { draftOverdueReminder } from "./billing-agent";

async function getClient(supabase: ServiceClient, clientId: string) {
  const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).single();
  if (error || !data) {
    throw new Error(`Client ${clientId} not found.`);
  }
  return data;
}

async function handleDraftOutreach(task: TaskRow, supabase: ServiceClient) {
  const { outreach_message_id } = task.payload as { outreach_message_id: string };

  const { data: message, error } = await supabase
    .from("outreach_messages")
    .select("*")
    .eq("id", outreach_message_id)
    .single();
  if (error || !message) {
    throw new Error(`Outreach message ${outreach_message_id} not found.`);
  }

  const client = await getClient(supabase, message.client_id);

  const draft = await draftOutreachMessage({
    clientName: client.name,
    contactName: client.contact_name,
    channel: message.channel,
    notes: client.notes,
  });

  const { error: approvalError } = await supabase.from("approvals").insert({
    unit: "agency",
    kind: "outreach_draft",
    task_id: task.id,
    title: `Outreach draft for ${client.name}`,
    summary: `${message.channel} · ${draft.subject || draft.body.slice(0, 60)}`,
    after: { outreach_message_id, subject: draft.subject, body: draft.body },
    requested_by: "outreach",
  });
  if (approvalError) throw new Error(`Failed to create approval: ${approvalError.message}`);

  return { draft };
}

async function handleDraftDeliverable(task: TaskRow, supabase: ServiceClient) {
  const { deliverable_id } = task.payload as { deliverable_id: string };

  const { data: deliverable, error } = await supabase
    .from("deliverables")
    .select("*")
    .eq("id", deliverable_id)
    .single();
  if (error || !deliverable) {
    throw new Error(`Deliverable ${deliverable_id} not found.`);
  }

  const client = await getClient(supabase, deliverable.client_id);

  const draft = await draftDeliverable({
    clientName: client.name,
    title: deliverable.title,
    brief: deliverable.brief,
  });

  const { error: approvalError } = await supabase.from("approvals").insert({
    unit: "agency",
    kind: "deliverable_draft",
    task_id: task.id,
    title: `Deliverable draft: ${deliverable.title}`,
    summary: `For ${client.name}`,
    after: { deliverable_id, content: draft.content },
    requested_by: "content",
  });
  if (approvalError) throw new Error(`Failed to create approval: ${approvalError.message}`);

  return { draft };
}

async function handleQaReview(task: TaskRow, supabase: ServiceClient) {
  const { deliverable_id } = task.payload as { deliverable_id: string };

  const { data: deliverable, error } = await supabase
    .from("deliverables")
    .select("*")
    .eq("id", deliverable_id)
    .single();
  if (error || !deliverable) {
    throw new Error(`Deliverable ${deliverable_id} not found.`);
  }

  const content = deliverable.draft_content ?? deliverable.brief;
  if (!content) {
    return { skipped: "nothing to review — no draft content or brief set" };
  }

  const report = await reviewDeliverable({
    title: deliverable.title,
    brief: deliverable.brief,
    content,
  });

  const { error: approvalError } = await supabase.from("approvals").insert({
    unit: "agency",
    kind: "qa_report",
    task_id: task.id,
    title: `QA report: ${deliverable.title}`,
    summary: report.summary,
    after: { deliverable_id, ...report },
    requested_by: "qa",
  });
  if (approvalError) throw new Error(`Failed to create approval: ${approvalError.message}`);

  return { report };
}

async function handleDraftOverdueReminder(task: TaskRow, supabase: ServiceClient) {
  const { invoice_id } = task.payload as { invoice_id: string };

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoice_id)
    .single();
  if (error || !invoice) {
    throw new Error(`Invoice ${invoice_id} not found.`);
  }
  if (!invoice.due_date) {
    return { skipped: "invoice has no due date set" };
  }

  const client = await getClient(supabase, invoice.client_id);
  const daysOverdue = Math.floor(
    (Date.now() - new Date(invoice.due_date).getTime()) / (24 * 60 * 60 * 1000)
  );

  const draft = await draftOverdueReminder({
    clientName: client.name,
    amount: invoice.amount,
    currency: invoice.currency,
    daysOverdue: Math.max(daysOverdue, 0),
  });

  const { error: approvalError } = await supabase.from("approvals").insert({
    unit: "agency",
    kind: "invoice_reminder_draft",
    task_id: task.id,
    title: `Overdue reminder: ${client.name}`,
    summary: `${invoice.amount} ${invoice.currency} · ${daysOverdue}d overdue`,
    after: { invoice_id, reminder: draft.reminder },
    requested_by: "billing",
  });
  if (approvalError) throw new Error(`Failed to create approval: ${approvalError.message}`);

  return { draft };
}

export const agencyHandlers: Record<string, RegistryEntry> = {
  "agency:draft_outreach": { agent: "outreach", handler: handleDraftOutreach },
  "agency:draft_deliverable": { agent: "content", handler: handleDraftDeliverable },
  "agency:qa_review": { agent: "qa", handler: handleQaReview },
  "agency:draft_overdue_reminder": { agent: "billing", handler: handleDraftOverdueReminder },
};
