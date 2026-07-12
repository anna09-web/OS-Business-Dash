import type { TaskRow } from "../logic";
import type { RegistryEntry, ServiceClient } from "../registry";
import { evaluateTrade } from "./risk-manager";
import { submitAlpacaOrder } from "./alpaca-client";

const START_OF_TODAY = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

async function computeAccountState(supabase: ServiceClient, startingEquity: number) {
  const [{ data: openTrades }, { data: closedTrades }] = await Promise.all([
    supabase.from("trades").select("id").eq("status", "open"),
    supabase.from("trades").select("pnl, exit_at").eq("status", "closed").order("exit_at", { ascending: true }),
  ]);

  let running = startingEquity;
  let peak = startingEquity;
  let realizedPnlToday = 0;
  const startOfToday = START_OF_TODAY();

  for (const t of closedTrades ?? []) {
    const pnl = t.pnl ?? 0;
    running += pnl;
    if (running > peak) peak = running;
    if (t.exit_at && new Date(t.exit_at) >= startOfToday) {
      realizedPnlToday += pnl;
    }
  }

  return {
    openTradesCount: openTrades?.length ?? 0,
    currentEquity: running,
    peakEquity: peak,
    realizedPnlToday,
  };
}

async function handleProposeTrade(task: TaskRow, supabase: ServiceClient) {
  const { symbol, side, quantity, entry_price, rationale_entry } = task.payload as {
    symbol: string;
    side: "long" | "short";
    quantity: number;
    entry_price: number;
    rationale_entry?: string;
  };

  const { data: rules, error: rulesError } = await supabase
    .from("trading_risk_rules")
    .select("*")
    .eq("id", 1)
    .single();
  if (rulesError || !rules) {
    throw new Error("Trading risk rules are not configured.");
  }

  const account = await computeAccountState(supabase, rules.starting_equity);

  const decision = evaluateTrade(
    {
      startingEquity: rules.starting_equity,
      maxDailyLossPct: rules.max_daily_loss_pct,
      maxDrawdownPct: rules.max_drawdown_pct,
      maxPositionSize: rules.max_position_size,
      maxConcurrentTrades: rules.max_concurrent_trades,
    },
    account,
    { quantity, entryPrice: entry_price }
  );

  if (!decision.allowed) {
    const { error: vetoError } = await supabase.from("trades").insert({
      symbol,
      side,
      quantity,
      entry_price,
      status: "vetoed",
      rationale_entry,
      veto_reason: decision.reason,
    });
    if (vetoError) throw new Error(vetoError.message);
    return { allowed: false, reason: decision.reason };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("trades")
    .insert({ symbol, side, quantity, entry_price, status: "open", rationale_entry })
    .select("id")
    .single();
  if (insertError || !inserted) {
    throw new Error(`Failed to record trade: ${insertError?.message}`);
  }

  // Best-effort: the local trade is already the authoritative journal entry.
  // A retry on Alpaca failure must never re-submit — so this never throws.
  let alpacaOrderId: string | null = null;
  try {
    const order = await submitAlpacaOrder({
      symbol,
      quantity,
      side: side === "long" ? "buy" : "sell",
    });
    alpacaOrderId = order?.id ?? null;
    if (alpacaOrderId) {
      await supabase.from("trades").update({ alpaca_order_id: alpacaOrderId }).eq("id", inserted.id);
    }
  } catch (err) {
    console.error(
      "[strategy-runner] Alpaca order submission failed (trade still journaled locally):",
      err
    );
  }

  return { allowed: true, trade_id: inserted.id, alpaca_order_id: alpacaOrderId };
}

export const tradingHandlers: Record<string, RegistryEntry> = {
  "trading:propose_trade": { agent: "strategy_runner", handler: handleProposeTrade },
};
