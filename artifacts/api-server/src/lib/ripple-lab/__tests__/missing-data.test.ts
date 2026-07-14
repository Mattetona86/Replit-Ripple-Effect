import { describe, it, expect } from "vitest";
import { RippleScoreBreakdown, RippleCompanyFromLLM } from "@workspace/api-zod";

function baseBreakdown() {
  return {
    exposureScore: 50,
    causalityScore: 50,
    timingScore: 50,
    fundamentalScore: 40,
    valuationScore: 40,
    confirmationScore: 50,
    riskScore: 50,
    rippleOpportunityScore: 55,
  };
}

describe("missing data is null, never silently zero or omitted", () => {
  it("accepts an explicit null for fundamentalScore/valuationScore", () => {
    const parsed = RippleScoreBreakdown.parse({ ...baseBreakdown(), fundamentalScore: null, valuationScore: null });
    expect(parsed.fundamentalScore).toBeNull();
    expect(parsed.valuationScore).toBeNull();
  });

  it("rejects the field being omitted entirely (must be present, even if null)", () => {
    const { fundamentalScore, ...withoutField } = baseBreakdown();
    expect(() => RippleScoreBreakdown.parse(withoutField)).toThrow();
  });

  it("rejects a string standing in for a missing number (no implicit coercion to a sentinel)", () => {
    expect(() => RippleScoreBreakdown.parse({ ...baseBreakdown(), fundamentalScore: "N/A" })).toThrow();
  });

  it("every *Score field is bounded to 0-100", () => {
    expect(() => RippleScoreBreakdown.parse({ ...baseBreakdown(), exposureScore: 150 })).toThrow();
    expect(() => RippleScoreBreakdown.parse({ ...baseBreakdown(), riskScore: -5 })).toThrow();
  });

  it("RippleCompanyFromLLM inherits the same null-not-zero contract for fundamental/valuation", () => {
    const company = {
      companyName: "Test Corp",
      ticker: "TST",
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
      exposureScore: 50,
      causalityScore: 50,
      timingScore: 50,
      fundamentalScore: null,
      valuationScore: null,
      confirmationScore: 50,
      riskScore: 50,
    };
    const parsed = RippleCompanyFromLLM.parse(company);
    expect(parsed.fundamentalScore).toBeNull();
    expect(parsed.valuationScore).toBeNull();
  });
});
