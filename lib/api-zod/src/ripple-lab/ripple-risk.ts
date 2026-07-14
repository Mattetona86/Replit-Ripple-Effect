import { z } from "zod";
import { Severity } from "./enums";

// Matches the wire shape of `risks[]`. Not one of the 11 requested schemas,
// but needed to fully validate the response.
export const RippleRisk = z.object({
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(300),
  severity: Severity,
});
export type RippleRisk = z.infer<typeof RippleRisk>;
