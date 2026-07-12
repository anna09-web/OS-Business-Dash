import { csvResponse, toCsv } from "@/lib/csv";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const HEADER = [
  "symbol",
  "side",
  "quantity",
  "entry_price",
  "exit_price",
  "entry_at",
  "exit_at",
  "status",
  "pnl",
  "rationale_entry",
  "rationale_exit",
  "veto_reason",
];

export async function GET() {
  await getProfile();
  const supabase = await createClient();

  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .order("entry_at", { ascending: false });

  const rows = (trades ?? []).map((trade) => [
    trade.symbol,
    trade.side,
    String(trade.quantity),
    String(trade.entry_price),
    trade.exit_price?.toString() ?? "",
    trade.entry_at,
    trade.exit_at ?? "",
    trade.status,
    trade.pnl?.toFixed(2) ?? "",
    trade.rationale_entry ?? "",
    trade.rationale_exit ?? "",
    trade.veto_reason ?? "",
  ]);

  return csvResponse(toCsv(HEADER, rows), "trade-journal.csv");
}
