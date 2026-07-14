import { z } from "zod";
import { EvidenceTier } from "./enums";

export const SourceEvidence = z.object({
  type: EvidenceTier,
  claim: z.string().min(1).max(150),
  basis: z.string().min(1),
});
export type SourceEvidence = z.infer<typeof SourceEvidence>;
