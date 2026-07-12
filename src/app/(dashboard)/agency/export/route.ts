import { csvResponse, toCsv } from "@/lib/csv";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const HEADER = ["client", "amount", "currency", "status", "due_date", "sent_at", "paid_at"];

export async function GET() {
  await getProfile();
  const supabase = await createClient();

  const [{ data: invoices }, { data: clients }] = await Promise.all([
    supabase.from("invoices").select("*").order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name"),
  ]);

  const clientsById = new Map((clients ?? []).map((c) => [c.id, c.name]));

  const rows = (invoices ?? []).map((invoice) => [
    clientsById.get(invoice.client_id) ?? "Unknown client",
    invoice.amount.toFixed(2),
    invoice.currency,
    invoice.status,
    invoice.due_date ?? "",
    invoice.sent_at ?? "",
    invoice.paid_at ?? "",
  ]);

  return csvResponse(toCsv(HEADER, rows), "invoices.csv");
}
