import { describe, it, expect } from "vitest";
import { EconomicDriver, RippleCompany, RippleChainNode } from "@workspace/api-zod";

describe("economic drivers and public companies are distinct entities", () => {
  it("EconomicDriver has no ticker/companyName — it cannot be mistaken for a company", () => {
    const driver = EconomicDriver.parse({
      driver: "GPU demand surge",
      description: "Hyperscaler capex is accelerating.",
      magnitude: "high",
    });
    expect(driver).not.toHaveProperty("ticker");
    expect(driver).not.toHaveProperty("companyName");
  });

  it("RippleCompany requires a ticker — a driver-shaped object fails validation", () => {
    const driverShaped = {
      driver: "GPU demand surge",
      description: "Hyperscaler capex is accelerating.",
      magnitude: "high",
    };
    expect(() => RippleCompany.parse(driverShaped)).toThrow();
  });

  it("EconomicDriver rejects a company-shaped object (missing driver/description/magnitude)", () => {
    const companyShaped = { companyName: "NVIDIA", ticker: "NVDA" };
    expect(() => EconomicDriver.parse(companyShaped)).toThrow();
  });

  it("RippleChainNode's `type` enum distinguishes company nodes from economic_driver nodes", () => {
    const companyNode = RippleChainNode.parse({
      id: "n1",
      type: "company",
      label: "NVIDIA",
      ticker: "NVDA",
      level: 1,
      direction: "positive",
      relationship: "confirmed",
      mechanism: "Direct beneficiary.",
      timeHorizon: "short_term",
      confidence: 90,
      evidence: [],
    });
    const driverNode = RippleChainNode.parse({
      id: "n2",
      type: "economic_driver",
      label: "GPU demand surge",
      ticker: null,
      level: 0,
      direction: "positive",
      relationship: "confirmed",
      mechanism: "Root cause of the ripple.",
      timeHorizon: "immediate",
      confidence: 95,
      evidence: [],
    });
    expect(companyNode.type).toBe("company");
    expect(companyNode.ticker).toBe("NVDA");
    expect(driverNode.type).toBe("economic_driver");
    expect(driverNode.ticker).toBeNull();
  });

  it("rejects a node whose type is not one of the four known kinds", () => {
    expect(() =>
      RippleChainNode.parse({
        id: "n3",
        type: "company_group", // not a real RippleEntityKind value
        label: "x",
        ticker: null,
        level: 0,
        direction: "neutral",
        relationship: "plausible",
        mechanism: "x",
        timeHorizon: "immediate",
        confidence: 50,
        evidence: [],
      }),
    ).toThrow();
  });
});
