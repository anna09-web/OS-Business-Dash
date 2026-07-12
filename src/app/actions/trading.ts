"use server";

import { revalidatePath } from "next/cache";

import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { TradeSide } from "@/types/database";

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

export async function updateRiskRules(formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase
    .from("trading_risk_rules")
    .update({
      starting_equity: Number(formData.get("starting_equity")),
      max_daily_loss_pct: Number(formData.get("max_daily_loss_pct")),
      max_drawdown_pct: Number(formData.get("max_drawdown_pct")),
      max_position_size: Number(formData.get("max_position_size")),
      max_concurrent_trades: Number(formData.get("max_concurrent_trades")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw new Error(error.message);

  revalidatePath("/trading");
}

export async function proposeTrade(formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const quantity = Number(formData.get("quantity"));
  const entryPrice = Number(formData.get("entry_price"));
  if (!symbol || Number.isNaN(quantity) || Number.isNaN(entryPrice)) {
    throw new Error("Symbol, quantity, and entry price are required.");
  }

  const { error } = await supabase.from("tasks").insert({
    unit: "trading",
    type: "propose_trade",
    payload: {
      symbol,
      side: (formData.get("side") as TradeSide) || "long",
      quantity,
      entry_price: entryPrice,
      rationale_entry: emptyToNull(formData.get("rationale_entry")),
    },
  });
  if (error) throw new Error(error.message);

  revalidatePath("/trading");
  revalidatePath("/agents");
}

export async function closeTrade(formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const tradeId = String(formData.get("trade_id"));
  const exitPrice = Number(formData.get("exit_price"));
  const rationaleExit = emptyToNull(formData.get("rationale_exit"));
  if (!tradeId || Number.isNaN(exitPrice)) {
    throw new Error("A valid exit price is required.");
  }

  const { data: trade, error: fetchError } = await supabase
    .from("trades")
    .select("side, quantity, entry_price")
    .eq("id", tradeId)
    .single();
  if (fetchError || !trade) throw new Error("Trade not found.");

  const direction = trade.side === "long" ? 1 : -1;
  const pnl = (exitPrice - trade.entry_price) * trade.quantity * direction;

  const { error } = await supabase
    .from("trades")
    .update({
      status: "closed",
      exit_price: exitPrice,
      exit_at: new Date().toISOString(),
      rationale_exit: rationaleExit,
      pnl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tradeId);
  if (error) throw new Error(error.message);

  revalidatePath("/trading");
}
