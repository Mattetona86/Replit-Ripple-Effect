import { z } from "zod";
import { ConfidenceLevel, Score } from "./enums";

// New, purely additive field — does not exist on the wire today. Computed
// server-side (see computeDataConfidence in ripple-llm.ts) from data already
// present in the response, not from a new LLM call. Mirrors the
// DataConfidenceMatrix pattern already used by fundamental analysis
// (see lib/api-zod/src/generated/types/dataConfidenceMatrix.ts).
export const DataConfidence = z.object({
  newsSourceQuality: ConfidenceLevel,
  knowledgeBaseCoverage: z.union([ConfidenceLevel, z.literal("unavailable")]),
  relationshipEvidence: ConfidenceLevel,
  fundamentalDataAvailability: z.union([ConfidenceLevel, z.literal("unavailable")]),
  overallConfidence: Score,
});
export type DataConfidence = z.infer<typeof DataConfidence>;
