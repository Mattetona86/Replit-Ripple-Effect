import { describe, it, expect } from "vitest";
import { computeRippleScore } from "../ripple-llm";
import type { RippleCompanyFromLLM } from "@workspace/api-zod";

function company(ticker: string, exposureScore: number): RippleCompanyFromLLM {
  return {
    companyName: ticker,
    ticker,
    relationshipType: "supplier",
    rippleLevel: 1,
    direction: "positive",
    mechanism: "x",
    timeHorizon: "short_term",
    confidence: 80,
    whyItMatters: "x",
    metricsToMonitor: [],
    mainRisk: "x",
    evidence: [],
    exposureScore,
    causalityScore: 50,
    timingScore: 50,
    fundamentalScore: 50,
    valuationScore: 50,
    confirmationScore: 50,
    riskScore: 50,
  };
}

describe("opportunity ordering", () => {
  it("sorts strictly by rippleOpportunityScore descending, matching the endpoint's own sort", () => {
    // Same pattern as artifacts/api-server/src/lib/ripple-lab/ripple-llm.ts:
    // recompute the score server-side, then sort by it — never by `confidence`.
    const raw = [company("LOW", 10), company("HIGH", 90), company("MID", 50)];
    const scored = raw.map(c => ({ ...c, rippleOpportunityScore: computeRippleScore(c) }));
    const sorted = [...scored].sort((a, b) => b.rippleOpportunityScore - a.rippleOpportunityScore);

    expect(sorted.map(c => c.ticker)).toEqual(["HIGH", "MID", "LOW"]);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].rippleOpportunityScore).toBeGreaterThanOrEqual(sorted[i].rippleOpportunityScore);
    }
  });

  it("a higher numeric `confidence` alone does not outrank a higher rippleOpportunityScore", () => {
    const lowExposureHighConfidence = { ...company("A", 5), confidence: 99 };
    const highExposureLowConfidence = { ...company("B", 95), confidence: 20 };
    const scored = [lowExposureHighConfidence, highExposureLowConfidence].map(c => ({
      ...c,
      rippleOpportunityScore: computeRippleScore(c),
    }));
    const sorted = [...scored].sort((a, b) => b.rippleOpportunityScore - a.rippleOpportunityScore);
    expect(sorted[0].ticker).toBe("B");
  });
});
