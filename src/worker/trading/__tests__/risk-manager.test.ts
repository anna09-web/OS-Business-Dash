import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateTrade, type AccountState, type RiskRules } from "../risk-manager";

const rules: RiskRules = {
  startingEquity: 10000,
  maxDailyLossPct: 3,
  maxDrawdownPct: 10,
  maxPositionSize: 1000,
  maxConcurrentTrades: 3,
};

const healthyAccount: AccountState = {
  openTradesCount: 0,
  currentEquity: 10000,
  peakEquity: 10000,
  realizedPnlToday: 0,
};

test("allows a trade within all bounds", () => {
  const result = evaluateTrade(rules, healthyAccount, { quantity: 10, entryPrice: 50 });
  assert.equal(result.allowed, true);
});

test("vetoes a trade over the max position size", () => {
  const result = evaluateTrade(rules, healthyAccount, { quantity: 100, entryPrice: 50 });
  assert.equal(result.allowed, false);
  assert.match(result.reason!, /position size/i);
});

test("vetoes when already at max concurrent trades", () => {
  const result = evaluateTrade(
    rules,
    { ...healthyAccount, openTradesCount: 3 },
    { quantity: 1, entryPrice: 50 }
  );
  assert.equal(result.allowed, false);
  assert.match(result.reason!, /concurrent/i);
});

test("vetoes when the daily loss limit is already hit", () => {
  const result = evaluateTrade(
    rules,
    { ...healthyAccount, realizedPnlToday: -300 }, // -3% of 10000
    { quantity: 1, entryPrice: 50 }
  );
  assert.equal(result.allowed, false);
  assert.match(result.reason!, /daily loss/i);
});

test("does not veto on daily loss just under the limit", () => {
  const result = evaluateTrade(
    rules,
    { ...healthyAccount, realizedPnlToday: -299 },
    { quantity: 1, entryPrice: 50 }
  );
  assert.equal(result.allowed, true);
});

test("vetoes when drawdown from peak equity exceeds the max", () => {
  const result = evaluateTrade(
    rules,
    { ...healthyAccount, peakEquity: 12000, currentEquity: 10000 }, // ~16.7% drawdown
    { quantity: 1, entryPrice: 50 }
  );
  assert.equal(result.allowed, false);
  assert.match(result.reason!, /drawdown/i);
});

test("veto reasons stack independently — position size is checked first", () => {
  const result = evaluateTrade(
    rules,
    { ...healthyAccount, openTradesCount: 3 },
    { quantity: 100, entryPrice: 50 }
  );
  assert.equal(result.allowed, false);
  assert.match(result.reason!, /position size/i);
});
