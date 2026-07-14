import { describe, it, expect } from "vitest";
import { computeRippleScore, computeDataConfidence } from "../ripple-llm";
import type { RippleCompanyFromLLM } from "@workspace/api-zod";

function baseCompany(overrides: Partial<RippleCompanyFromLLM> = {}): RippleCompanyFromLLM {
  return {
    companyName: "Test Corp",
    ticker: "TST",
    relationshipType: "supplier",
    rippleLevel: 1,
    direction: "positive",
    mechanism: "Supplies a key component.",
    timeHorizon: "short_term",
    confidence: 80,
    whyItMatters: "Direct exposure to the driver.",
    metricsToMonitor: [],
    mainRisk: "Customer concentration.",
    evidence: [],
    exposureScore: 70,
    causalityScore: 60,
    timingScore: 50,
    fundamentalScore: 65,
    valuationScore: 55,
    confirmationScore: 40,
    riskScore: 30,
    ...overrides,
  };
}

describe("computeRippleScore", () => {
  it("stays within 0-100 with full data", () => {
    const score = computeRippleScore(baseCompany());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("stays within 0-100 at the extremes (all zeros)", () => {
    const score = computeRippleScore(
      baseCompany({ exposureScore: 0, causalityScore: 0, timingScore: 0, fundamentalScore: 0, valuationScore: 0, confirmationScore: 0, riskScore: 100 }),
    );
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("stays within 0-100 at the extremes (all hundreds)", () => {
    const score = computeRippleScore(
      baseCompany({ exposureScore: 100, causalityScore: 100, timingScore: 100, fundamentalScore: 100, valuationScore: 100, confirmationScore: 100, riskScore: 0 }),
    );
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("redistributes weights instead of penalizing missing fundamental/valuation data", () => {
    const withData = computeRippleScore(baseCompany());
    const withoutFundamentalOrValuation = computeRippleScore(
      baseCompany({ fundamentalScore: null, valuationScore: null }),
    );
    // Redistribution normalizes by the active weight sum, so dropping two
    // present, positive-scoring components should not crater the result —
    // it should land in the same ballpark as the fully-known case, not near 0.
    expect(withoutFundamentalOrValuation).toBeGreaterThanOrEqual(0);
    expect(withoutFundamentalOrValuation).toBeLessThanOrEqual(100);
    expect(Math.abs(withData - withoutFundamentalOrValuation)).toBeLessThan(40);
  });

  it("never coerces null fundamental/valuation to 0 (partial score, not a zero score)", () => {
    // Every other component is strong (80) so the two scenarios only differ
    // in how fundamental/valuation are handled — an all-zero baseline would
    // make both scenarios collapse to 0 regardless of null-handling, which
    // wouldn't actually exercise the redistribution logic.
    const strongExceptFundamentalValuation = {
      exposureScore: 80, causalityScore: 80, timingScore: 80, confirmationScore: 80, riskScore: 20,
    };
    const nullFundamentalAndValuation = computeRippleScore(
      baseCompany({ ...strongExceptFundamentalValuation, fundamentalScore: null, valuationScore: null }),
    );
    const explicitZeroFundamentalAndValuation = computeRippleScore(
      baseCompany({ ...strongExceptFundamentalValuation, fundamentalScore: 0, valuationScore: 0 }),
    );
    // If null were silently treated as 0, these two would be identical.
    // They must not be: null drops those weights out of the denominator
    // entirely, while an explicit 0 stays in the denominator and drags the
    // weighted average down.
    expect(nullFundamentalAndValuation).toBeGreaterThan(explicitZeroFundamentalAndValuation);
  });
});

describe("computeDataConfidence", () => {
  it("reports 'unavailable' rather than a fabricated tier when there is no data to assess", () => {
    const result = computeDataConfidence({ headline: "x" }, [], [], 50);
    expect(result.knowledgeBaseCoverage).toBe("unavailable");
    expect(result.fundamentalDataAvailability).toBe("unavailable");
  });

  it("keeps overallConfidence equal to the classification confidence passed in", () => {
    const result = computeDataConfidence({ headline: "x" }, [], [], 73);
    expect(result.overallConfidence).toBe(73);
  });
});
