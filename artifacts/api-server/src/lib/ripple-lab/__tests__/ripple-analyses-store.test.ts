import { describe, it, expect } from "vitest";
import { makeDedupeKey } from "../ripple-analyses-store";

describe("makeDedupeKey (pure logic — no database needed)", () => {
  it("is stable for the same article regardless of ticker order or case", () => {
    const a = makeDedupeKey({ headline: "NVIDIA raises guidance", primaryTickers: ["NVDA", "TSM"] }, "en");
    const b = makeDedupeKey({ headline: "NVIDIA raises guidance", primaryTickers: ["tsm", "nvda"] }, "en");
    expect(a).toBe(b);
  });

  it("differs by language (an EN and IT analysis of the same article are distinct rows)", () => {
    const en = makeDedupeKey({ headline: "NVIDIA raises guidance" }, "en");
    const it = makeDedupeKey({ headline: "NVIDIA raises guidance" }, "it");
    expect(en).not.toBe(it);
  });

  it("differs for a different headline", () => {
    const a = makeDedupeKey({ headline: "NVIDIA raises guidance" }, "en");
    const b = makeDedupeKey({ headline: "AMD raises guidance" }, "en");
    expect(a).not.toBe(b);
  });

  it("treats missing primaryTickers the same as an empty array", () => {
    const a = makeDedupeKey({ headline: "x" }, "en");
    const b = makeDedupeKey({ headline: "x", primaryTickers: [] }, "en");
    expect(a).toBe(b);
  });
});

// Requires a real, reachable Postgres — opt in explicitly:
//   DATABASE_URL=postgres://... RUN_DB_INTEGRATION_TESTS=1 pnpm --filter @workspace/api-server test
// Not run by default (and not run in this sandbox, which has no database).
describe.skipIf(!process.env.RUN_DB_INTEGRATION_TESTS)("saveRippleAnalysis / findRecentRippleAnalysis / getRippleAnalysisById (integration)", () => {
  it("reuses an existing row for the same article instead of creating a duplicate", async () => {
    const { saveRippleAnalysis, findRecentRippleAnalysis, getRippleAnalysisById } = await import("../ripple-analyses-store");
    const input = { headline: `Integration test article ${Date.now()}` };
    const fakeAnalysis = await import("./fixtures/fake-analysis").then(m => m.fakeAnalysis());

    const first = await saveRippleAnalysis("test-user", input, "en", fakeAnalysis);
    const recent = await findRecentRippleAnalysis(input, "en");
    expect(recent?.id).toBe(first.id);

    const reloaded = await getRippleAnalysisById(first.id);
    expect(reloaded?.article.headline).toBe(input.headline);
    expect(reloaded?.analysis.event.eventTitle).toBe(fakeAnalysis.event.eventTitle);
  });
});
