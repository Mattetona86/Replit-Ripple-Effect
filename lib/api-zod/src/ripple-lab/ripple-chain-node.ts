import { z } from "zod";
import { Direction, RelationshipConfidence, RippleEntityKind, RippleLevel, Score, TimeHorizon } from "./enums";

// Matches the wire shape of `rippleChain[]` items, unchanged from the
// original codebase's `RippleChainNode`. Kept this name (rather than the
// "RippleRelationship" used in an earlier draft of this contract) because the
// shape genuinely describes one entity (company/industry/theme/economic_driver,
// identified by its own id/label/ticker) carrying a single relationship-
// strength rating back to the event — not an edge between two entities, which
// is what "Relationship" would imply. The Anthropic tool prompt itself
// already calls these "Ripple chain nodes."
export const RippleChainNode = z.object({
  id: z.string().min(1),
  type: RippleEntityKind,
  label: z.string().min(1),
  ticker: z.string().min(1).max(10).nullable(),
  level: RippleLevel,
  direction: Direction,
  relationship: RelationshipConfidence,
  mechanism: z.string().min(1).max(200),
  timeHorizon: TimeHorizon,
  confidence: Score,
  evidence: z.array(z.string()).max(2),
});
export type RippleChainNode = z.infer<typeof RippleChainNode>;
