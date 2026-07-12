// Risk Manager Agent's veto logic. Pure and deterministic — this is the one
// piece of the Trading unit that must never be reachable by an LLM or a
// prompt. The Strategy Runner (or the owner, proposing a trade manually)
// calls this before a trade is ever recorded as open; there is no path that
// bypasses it.

export interface RiskRules {
  startingEquity: number;
  maxDailyLossPct: number;
  maxDrawdownPct: number;
  maxPositionSize: number;
  maxConcurrentTrades: number;
}

export interface ProposedTrade {
  quantity: number;
  entryPrice: number;
}

export interface AccountState {
  openTradesCount: number;
  currentEquity: number;
  peakEquity: number;
  realizedPnlToday: number;
}

export interface VetoResult {
  allowed: boolean;
  reason?: string;
}

export function evaluateTrade(
  rules: RiskRules,
  account: AccountState,
  trade: ProposedTrade
): VetoResult {
  const positionSize = trade.quantity * trade.entryPrice;
  if (positionSize > rules.maxPositionSize) {
    return {
      allowed: false,
      reason: `Position size ${positionSize.toFixed(2)} exceeds the max position size of ${rules.maxPositionSize.toFixed(2)}.`,
    };
  }

  if (account.openTradesCount >= rules.maxConcurrentTrades) {
    return {
      allowed: false,
      reason: `Already at the max of ${rules.maxConcurrentTrades} concurrent open trade(s).`,
    };
  }

  const dailyLossLimit = (rules.startingEquity * rules.maxDailyLossPct) / 100;
  if (account.realizedPnlToday <= -dailyLossLimit) {
    return {
      allowed: false,
      reason: `Daily loss limit reached: ${account.realizedPnlToday.toFixed(2)} realized today vs a limit of -${dailyLossLimit.toFixed(2)}.`,
    };
  }

  if (account.peakEquity > 0) {
    const drawdownPct = ((account.peakEquity - account.currentEquity) / account.peakEquity) * 100;
    if (drawdownPct >= rules.maxDrawdownPct) {
      return {
        allowed: false,
        reason: `Drawdown of ${drawdownPct.toFixed(1)}% from peak equity exceeds the max of ${rules.maxDrawdownPct}%.`,
      };
    }
  }

  return { allowed: true };
}
