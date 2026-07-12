import { Activity, AlertOctagon, LineChart, ShieldAlert } from "lucide-react";

import { closeTrade, proposeTrade, updateRiskRules } from "@/app/actions/trading";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export default async function TradingPage() {
  const profile = await getProfile();
  const isOwner = profile.role === "owner";
  const supabase = await createClient();

  const [{ data: rules }, { data: trades }, { data: settings }] = await Promise.all([
    supabase.from("trading_risk_rules").select("*").eq("id", 1).single(),
    supabase.from("trades").select("*").order("entry_at", { ascending: false }),
    supabase.from("system_settings").select("trading_mode").eq("id", 1).single(),
  ]);

  const allTrades = trades ?? [];
  const openTrades = allTrades.filter((t) => t.status === "open");
  const closedTrades = allTrades.filter((t) => t.status === "closed");
  const vetoedTrades = allTrades.filter((t) => t.status === "vetoed");

  const startingEquity = rules?.starting_equity ?? 0;
  const closedByExit = [...closedTrades].sort(
    (a, b) => new Date(a.exit_at ?? 0).getTime() - new Date(b.exit_at ?? 0).getTime()
  );
  let running = startingEquity;
  let peak = startingEquity;
  for (const t of closedByExit) {
    running += t.pnl ?? 0;
    if (running > peak) peak = running;
  }
  const currentEquity = running;
  const drawdownPct = peak > 0 ? ((peak - currentEquity) / peak) * 100 : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPnl = closedTrades
    .filter((t) => t.exit_at && new Date(t.exit_at) >= today)
    .reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  const wins = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
  const losses = closedTrades.filter((t) => (t.pnl ?? 0) < 0);
  const winRate = closedTrades.length ? (wins.length / closedTrades.length) * 100 : null;
  const avgWin = wins.length ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
  const avgLoss = losses.length
    ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length)
    : 0;
  const rewardRisk = avgLoss > 0 ? avgWin / avgLoss : null;

  return (
    <div>
      <PageHeader
        title="Day Trading"
        description="Paper-first strategy execution with a hard-coded, non-overridable risk veto."
      />

      <div className="mb-4">
        <Badge variant="outline" className="uppercase">
          Mode: {settings?.trading_mode ?? "paper"} — live trading requires the Phase 7 credential
          vault flow
        </Badge>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Equity" value={`£${currentEquity.toFixed(2)}`} icon={LineChart} />
        <KpiCard
          label="Today's P/L"
          value={`£${todayPnl.toFixed(2)}`}
          icon={Activity}
          accent={todayPnl < 0 ? "destructive" : todayPnl > 0 ? "success" : undefined}
        />
        <KpiCard label="Open positions" value={String(openTrades.length)} icon={LineChart} />
        <KpiCard
          label="Drawdown vs limit"
          value={`${drawdownPct.toFixed(1)}% / ${rules?.max_drawdown_pct ?? 0}%`}
          icon={ShieldAlert}
          accent={rules && drawdownPct >= rules.max_drawdown_pct * 0.75 ? "warning" : undefined}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>End-of-day summary</CardTitle>
        </CardHeader>
        <CardContent>
          {closedTrades.length > 0 ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Win rate</p>
                <p className="text-lg font-semibold tabular-nums">{winRate?.toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg reward:risk</p>
                <p className="text-lg font-semibold tabular-nums">
                  {rewardRisk !== null ? `${rewardRisk.toFixed(2)}:1` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Closed trades</p>
                <p className="text-lg font-semibold tabular-nums">{closedTrades.length}</p>
              </div>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No closed trades yet — the Reporter Agent&apos;s summary fills in once you close some.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Risk rules</CardTitle>
        </CardHeader>
        <CardContent>
          {isOwner ? (
            <form action={updateRiskRules} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="flex flex-col gap-1">
                <Label htmlFor="starting_equity">Starting equity</Label>
                <Input
                  id="starting_equity"
                  name="starting_equity"
                  type="number"
                  step="0.01"
                  defaultValue={rules?.starting_equity}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="max_daily_loss_pct">Max daily loss %</Label>
                <Input
                  id="max_daily_loss_pct"
                  name="max_daily_loss_pct"
                  type="number"
                  step="0.1"
                  defaultValue={rules?.max_daily_loss_pct}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="max_drawdown_pct">Max drawdown %</Label>
                <Input
                  id="max_drawdown_pct"
                  name="max_drawdown_pct"
                  type="number"
                  step="0.1"
                  defaultValue={rules?.max_drawdown_pct}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="max_position_size">Max position size</Label>
                <Input
                  id="max_position_size"
                  name="max_position_size"
                  type="number"
                  step="0.01"
                  defaultValue={rules?.max_position_size}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="max_concurrent_trades">Max concurrent trades</Label>
                <Input
                  id="max_concurrent_trades"
                  name="max_concurrent_trades"
                  type="number"
                  defaultValue={rules?.max_concurrent_trades}
                />
              </div>
              <Button type="submit" className="col-span-2 self-end sm:col-span-1">
                Save rules
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Max daily loss {rules?.max_daily_loss_pct}% · max drawdown {rules?.max_drawdown_pct}% ·
              max position £{rules?.max_position_size} · max {rules?.max_concurrent_trades} concurrent
              trades. Only the owner can change these.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Open positions</CardTitle>
        </CardHeader>
        <CardContent>
          {openTrades.length > 0 ? (
            <ul className="divide-y divide-border">
              {openTrades.map((trade) => (
                <li key={trade.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{trade.symbol}</span>
                    <Badge variant="outline" className="capitalize">
                      {trade.side}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {trade.quantity} @ £{trade.entry_price}
                    </span>
                  </div>
                  {trade.rationale_entry && (
                    <p className="mt-1 text-xs text-muted-foreground">{trade.rationale_entry}</p>
                  )}
                  {isOwner && (
                    <form
                      action={closeTrade}
                      className="mt-2 flex flex-wrap items-center gap-1.5"
                    >
                      <input type="hidden" name="trade_id" value={trade.id} />
                      <Input
                        name="exit_price"
                        type="number"
                        step="0.01"
                        placeholder="Exit price"
                        className="h-8 w-28"
                        required
                      />
                      <Input
                        name="rationale_exit"
                        placeholder="Exit rationale"
                        className="h-8 w-48"
                      />
                      <Button type="submit" size="sm" variant="secondary">
                        Close
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No open positions.</p>
          )}

          {isOwner && (
            <form
              action={proposeTrade}
              className="mt-6 grid gap-3 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-5"
            >
              <div className="flex flex-col gap-1">
                <Label htmlFor="symbol">Symbol</Label>
                <Input id="symbol" name="symbol" required />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="side">Side</Label>
                <select
                  id="side"
                  name="side"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  defaultValue="long"
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" name="quantity" type="number" step="0.0001" required />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="entry_price">Entry price</Label>
                <Input id="entry_price" name="entry_price" type="number" step="0.01" required />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="rationale_entry">Rationale</Label>
                <Input id="rationale_entry" name="rationale_entry" />
              </div>
              <Button type="submit" className="lg:col-span-5">
                Propose trade
              </Button>
            </form>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Every proposed trade is checked against the risk rules above before it&apos;s recorded —
            the Risk Manager&apos;s veto can&apos;t be bypassed by the Strategy Runner or by a prompt.
            There&apos;s no automated signal generation yet since that needs your actual strategy
            rules; propose trades manually until that&apos;s wired up.
          </p>
        </CardContent>
      </Card>

      {vetoedTrades.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Vetoed trades</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {vetoedTrades.map((trade) => (
                <li key={trade.id} className="flex items-start gap-2 py-2.5 text-sm">
                  <AlertOctagon className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="font-medium">{trade.symbol}</span>{" "}
                      <span className="text-muted-foreground">
                        {trade.side} · {trade.quantity} @ £{trade.entry_price}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{trade.veto_reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Trade journal</CardTitle>
          {isOwner && allTrades.length > 0 && (
            <a href="/trading/export" className="text-xs text-primary hover:underline">
              Export CSV
            </a>
          )}
        </CardHeader>
        <CardContent>
          {closedTrades.length > 0 ? (
            <ul className="divide-y divide-border">
              {closedTrades.map((trade) => (
                <li key={trade.id} className="py-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{trade.symbol}</span>
                    <Badge variant="outline" className="capitalize">
                      {trade.side}
                    </Badge>
                    <span
                      className={`tabular-nums ${(trade.pnl ?? 0) >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      £{trade.pnl?.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      £{trade.entry_price} → £{trade.exit_price}
                    </span>
                  </div>
                  {(trade.rationale_entry || trade.rationale_exit) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {trade.rationale_entry} {trade.rationale_exit && `· ${trade.rationale_exit}`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No closed trades yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
