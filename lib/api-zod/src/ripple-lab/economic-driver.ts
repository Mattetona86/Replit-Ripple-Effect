import { z } from "zod";
import { Magnitude } from "./enums";

export const EconomicDriver = z.object({
  driver: z.string().min(1).max(80),
  description: z.string().min(1).max(300),
  magnitude: Magnitude,
});
export type EconomicDriver = z.infer<typeof EconomicDriver>;
