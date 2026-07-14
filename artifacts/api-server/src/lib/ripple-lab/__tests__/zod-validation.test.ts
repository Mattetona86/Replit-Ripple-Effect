import { describe, it, expect } from "vitest";
import { NewsAnalysisRequest, RippleAnalysisResultFromLLM } from "@workspace/api-zod";

describe("NewsAnalysisRequest (request validation)", () => {
  it("accepts a minimal valid request and defaults language to en", () => {
    const parsed = NewsAnalysisRequest.parse({ headline: "NVIDIA raises guidance" });
    expect(parsed.language).toBe("en");
    expect(parsed.headline).toBe("NVIDIA raises guidance");
  });

  it("rejects an empty headline", () => {
    expect(() => NewsAnalysisRequest.parse({ headline: "" })).toThrow();
  });

  it("rejects a missing headline", () => {
    expect(() => NewsAnalysisRequest.parse({})).toThrow();
  });

  it("rejects an invalid language value instead of silently defaulting", () => {
    expect(() => NewsAnalysisRequest.parse({ headline: "x", language: "fr" })).toThrow();
  });

  it("trims and caps primaryTickers length per item", () => {
    const parsed = NewsAnalysisRequest.parse({ headline: "x", primaryTickers: [" nvda ", "MSFT"] });
    expect(parsed.primaryTickers).toEqual(["nvda", "MSFT"]);
  });
});

function validRawLlmPayload() {
  return {
    event: {
      eventTitle: "NVIDIA raises guidance",
      eventSummary: "NVIDIA reported strong data-center revenue and raised full-year guidance.",
      eventType: "guidance",
      factualStatement: "FACT: NVIDIA raised guidance.",
      interpretation: "INFERENCE: demand for AI accelerators remains strong.",
      uncertainties: [],
    },
    classification: {
      importance: "THEME_BOOSTER",
      direction: "positive",
      timeHorizon: "medium_term",
      confidence: 70,
      themes: ["AI infrastructure"],
    },
    economicDrivers: [{ driver: "GPU demand surge", description: "Hyperscaler capex is accelerating.", magnitude: "high" }],
    industries: [],
    rippleChain: [],
    opportunities: [],
    risks: [],
    confirmationSignals: [],
    invalidationSignals: [],
    sources: [],
  };
}

describe("RippleAnalysisResultFromLLM (Anthropic output validation)", () => {
  it("accepts a well-formed payload", () => {
    expect(() => RippleAnalysisResultFromLLM.parse(validRawLlmPayload())).not.toThrow();
  });

  it("rejects a payload missing the required `event` field", () => {
    const payload = validRawLlmPayload() as Record<string, unknown>;
    delete payload.event;
    expect(() => RippleAnalysisResultFromLLM.parse(payload)).toThrow();
  });

  it("rejects a payload with an invalid enum value", () => {
    const payload = validRawLlmPayload();
    // Not a type error: validRawLlmPayload()'s inferred type widens string
    // literals to `string`, so this is only invalid at the Zod/runtime level.
    payload.classification.direction = "slightly_positive";
    expect(() => RippleAnalysisResultFromLLM.parse(payload)).toThrow();
  });

  it("degrades a malformed non-critical array to empty instead of failing the whole parse", () => {
    const payload = validRawLlmPayload() as Record<string, unknown>;
    payload.risks = "not an array";
    const result = RippleAnalysisResultFromLLM.parse(payload);
    expect(result.risks).toEqual([]);
  });

  it("still requires `classification` to be well-formed (not wrapped in .catch)", () => {
    const payload = validRawLlmPayload() as Record<string, unknown>;
    (payload.classification as Record<string, unknown>).confidence = "not a number";
    expect(() => RippleAnalysisResultFromLLM.parse(payload)).toThrow();
  });
});
