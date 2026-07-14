import { z } from "zod";
import { EventType } from "./enums";

export const NewsEvent = z.object({
  eventTitle: z.string().min(1).max(120),
  eventSummary: z.string().min(1).max(600),
  eventType: EventType,
  factualStatement: z.string().min(1),
  interpretation: z.string().min(1),
  uncertainties: z.array(z.string()).max(3),
});
export type NewsEvent = z.infer<typeof NewsEvent>;
