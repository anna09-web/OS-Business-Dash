"use server";

import { revalidatePath } from "next/cache";

import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { ClientStatus, DeliverableKind, OutreachChannel } from "@/types/database";

async function requireOwner() {
  const profile = await getProfile();
  if (profile.role !== "owner") {
    throw new Error("Only the owner can do this.");
  }
  return profile;
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = value ? String(value).trim() : "";
  return s.length > 0 ? s : null;
}

export async function addClient(formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Client name is required.");

  const { error } = await supabase.from("clients").insert({
    name,
    contact_name: emptyToNull(formData.get("contact_name")),
    contact_email: emptyToNull(formData.get("contact_email")),
    value: formData.get("value") ? Number(formData.get("value")) : null,
    notes: emptyToNull(formData.get("notes")),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/agency");
}

export async function updateClientStatus(formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const clientId = String(formData.get("client_id"));
  const status = String(formData.get("status")) as ClientStatus;

  const { error } = await supabase
    .from("clients")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", clientId);
  if (error) throw new Error(error.message);

  revalidatePath("/agency");
}

export async function addDeliverable(formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const clientId = String(formData.get("client_id"));
  const title = String(formData.get("title") ?? "").trim();
  if (!clientId || !title) throw new Error("Client and title are required.");

  const { error } = await supabase.from("deliverables").insert({
    client_id: clientId,
    title,
    kind: (formData.get("kind") as DeliverableKind) || "content",
    brief: emptyToNull(formData.get("brief")),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/agency");
}

export async function requestDeliverableDraft(deliverableId: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase.from("tasks").insert({
    unit: "agency",
    type: "draft_deliverable",
    payload: { deliverable_id: deliverableId },
  });
  if (error) throw new Error(error.message);

  revalidatePath("/agency");
  revalidatePath("/agents");
}

export async function requestQaReview(deliverableId: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase.from("tasks").insert({
    unit: "agency",
    type: "qa_review",
    payload: { deliverable_id: deliverableId },
  });
  if (error) throw new Error(error.message);

  revalidatePath("/agency");
  revalidatePath("/agents");
}

export async function markDeliverableDelivered(deliverableId: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase
    .from("deliverables")
    .update({ status: "delivered", updated_at: new Date().toISOString() })
    .eq("id", deliverableId);
  if (error) throw new Error(error.message);

  revalidatePath("/agency");
}

export async function addOutreachMessage(formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const clientId = String(formData.get("client_id"));
  if (!clientId) throw new Error("A client is required.");

  const { error } = await supabase.from("outreach_messages").insert({
    client_id: clientId,
    channel: (formData.get("channel") as OutreachChannel) || "email",
    to_contact: emptyToNull(formData.get("to_contact")),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/agency");
}

export async function requestOutreachDraft(outreachMessageId: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase.from("tasks").insert({
    unit: "agency",
    type: "draft_outreach",
    payload: { outreach_message_id: outreachMessageId },
  });
  if (error) throw new Error(error.message);

  revalidatePath("/agency");
  revalidatePath("/agents");
}

export async function markOutreachSent(outreachMessageId: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase
    .from("outreach_messages")
    .update({ status: "sent", updated_at: new Date().toISOString() })
    .eq("id", outreachMessageId);
  if (error) throw new Error(error.message);

  revalidatePath("/agency");
}

export async function addInvoice(formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const clientId = String(formData.get("client_id"));
  const amount = Number(formData.get("amount"));
  if (!clientId || Number.isNaN(amount)) {
    throw new Error("A client and a valid amount are required.");
  }

  const { error } = await supabase.from("invoices").insert({
    client_id: clientId,
    amount,
    due_date: emptyToNull(formData.get("due_date")),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/agency");
}

export async function markInvoiceSent(invoiceId: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase
    .from("invoices")
    .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);

  revalidatePath("/agency");
}

export async function markInvoicePaid(invoiceId: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);

  revalidatePath("/agency");
}

export async function requestOverdueReminder(invoiceId: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase.from("tasks").insert({
    unit: "agency",
    type: "draft_overdue_reminder",
    payload: { invoice_id: invoiceId },
  });
  if (error) throw new Error(error.message);

  revalidatePath("/agency");
  revalidatePath("/agents");
}
