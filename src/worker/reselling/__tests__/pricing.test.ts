import assert from "node:assert/strict";
import { test } from "node:test";

import { computeRepriceSuggestion } from "../pricing";

test("undercuts toward the competitor when within bounds", () => {
  const result = computeRepriceSuggestion({
    costPrice: 10,
    currentPrice: 20,
    competitorPrice: 17,
    minMarginPct: 20, // floor = 12
    maxDiscountPct: 50, // floor = 10
  });
  assert.equal(result.suggestedPrice, 17);
});

test("never drops below the min-margin floor even if the competitor is cheaper", () => {
  const result = computeRepriceSuggestion({
    costPrice: 10,
    currentPrice: 20,
    competitorPrice: 5,
    minMarginPct: 20, // floor = 12
    maxDiscountPct: 90, // floor = 2 (doesn't bind)
  });
  assert.equal(result.suggestedPrice, 12);
  assert.match(result.reason, /min-margin floor/);
});

test("never drops by more than max-discount-per-adjustment even above margin floor", () => {
  const result = computeRepriceSuggestion({
    costPrice: 5,
    currentPrice: 20,
    competitorPrice: 8,
    minMarginPct: 10, // floor = 5.5 (doesn't bind)
    maxDiscountPct: 15, // floor = 17
  });
  assert.equal(result.suggestedPrice, 17);
  assert.match(result.reason, /max-discount floor/);
});

test("raises the price when the competitor is priced higher", () => {
  const result = computeRepriceSuggestion({
    costPrice: 10,
    currentPrice: 20,
    competitorPrice: 25,
    minMarginPct: 20,
    maxDiscountPct: 15,
  });
  assert.equal(result.suggestedPrice, 25);
  assert.match(result.reason, /raising to match/);
});

test("suggests nothing when already at the bounded price", () => {
  const result = computeRepriceSuggestion({
    costPrice: 10,
    currentPrice: 17,
    competitorPrice: 17,
    minMarginPct: 20,
    maxDiscountPct: 50,
  });
  assert.equal(result.suggestedPrice, null);
});
