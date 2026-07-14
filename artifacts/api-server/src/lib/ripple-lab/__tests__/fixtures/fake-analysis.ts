import type { RippleAnalysisResult } from "@workspace/api-zod";

// Minimal but schema-valid RippleAnalysisResult for integration tests that
// need something to persist without calling Anthropic.
export function fakeAnalysis(): RippleAnalysisResult {
  return {
    news: { headline: "Integration test article", source: "", publishedAt: "", url: "", primaryTickers: [] },
    event: {
      eventTitle: "Test event",
      eventSummary: "A test event for integration testing.",
      eventType: "other",
      factualStatement: "FACT: this is a test.",
      interpretation: "INFERENCE: none.",
      uncertainties: [],
    },
    classification: { importance: "NOISE", direction: "neutral", timeHorizon: "immediate", confidence: 50, themes: [] },
    economicDrivers: [],
    industries: [],
    rippleChain: [],
    opportunities: [],
    risks: [],
    confirmationSignals: [],
    invalidationSignals: [],
    sources: [],
    dataConfidence: {
      newsSourceQuality: "low",
      knowledgeBaseCoverage: "unavailable",
      relationshipEvidence: "low",
      fundamentalDataAvailability: "unavailable",
      overallConfidence: 50,
    },
  };
}
