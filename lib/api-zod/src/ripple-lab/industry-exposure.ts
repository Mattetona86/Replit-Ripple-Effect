import { z } from "zod";
import { Direction, RippleLevel, Score } from "./enums";

// Matches the wire shape of `industries[]` as produced today. Not one of the
// 11 schemas requested for the redesign, but needed to validate the full
// LLM response — kept separate from RippleChainNode rather than merged
// into it, because it's missing the id/evidence/strength fields a relationship
// has, and synthesizing those would mean inventing data the LLM never provided.
export const IndustryExposure = z.object({
  name: z.string().min(1),
  direction: Direction,
  level: RippleLevel,
  mechanism: z.string().min(1).max(200),
  confidence: Score,
});
export type IndustryExposure = z.infer<typeof IndustryExposure>;
