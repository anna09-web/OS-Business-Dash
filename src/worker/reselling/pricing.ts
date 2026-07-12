// Repricer Agent's core logic. Deterministic and rule-based — no LLM call.
// Bounded by two floors set by the owner per listing: never price below
// min-margin-over-cost, and never drop the price by more than
// max-discount-per-adjustment from where it is today.

export interface RepriceInput {
  costPrice: number;
  currentPrice: number;
  competitorPrice: number;
  minMarginPct: number;
  maxDiscountPct: number;
}

export interface RepriceResult {
  suggestedPrice: number | null;
  reason: string;
}

const EPSILON = 0.005; // half a penny — avoids "suggesting" a no-op cent rounding change

export function computeRepriceSuggestion(input: RepriceInput): RepriceResult {
  const { costPrice, currentPrice, competitorPrice, minMarginPct, maxDiscountPct } = input;

  const marginFloor = round2(costPrice * (1 + minMarginPct / 100));
  const discountFloor = round2(currentPrice * (1 - maxDiscountPct / 100));
  const floor = Math.max(marginFloor, discountFloor);

  const candidate = round2(Math.max(competitorPrice, floor));

  if (Math.abs(candidate - currentPrice) < EPSILON) {
    return { suggestedPrice: null, reason: "Already at the bounded competitive price." };
  }

  if (candidate > currentPrice) {
    return {
      suggestedPrice: candidate,
      reason: `Competitor price (${competitorPrice}) is above the current listing — raising to match.`,
    };
  }

  const bound = floor === marginFloor ? "min-margin floor" : "max-discount floor";
  return {
    suggestedPrice: candidate,
    reason: `Undercutting toward competitor price (${competitorPrice}), bounded by the ${bound}.`,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
