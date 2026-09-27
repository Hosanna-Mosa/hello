/**
 * Reference data -> wire types.
 *
 * `Avatar.asset` is deliberately never populated. On the client it is a local
 * asset module resolved from the id; there is no URL to send, and inventing one
 * would be the first photo field.
 */

import type { Avatar, Interest, InterestCategory, Plan, PlanPeriod } from "@/types/wire.js";
import type { AvatarDoc } from "@/models/avatar.model.js";
import type { InterestDoc } from "@/models/interest.model.js";
import type { PlanDoc } from "@/models/plan.model.js";

export function toInterest(doc: InterestDoc): Interest {
  return { id: doc._id, label: doc.label, category: doc.category as InterestCategory };
}

export function toAvatar(doc: AvatarDoc): Avatar {
  // No `asset`: the artwork is bundled in the app, never sent. The client maps
  // the id to a local file, which is what keeps "no photos anywhere" true even
  // if this endpoint were ever compromised.
  return { id: doc._id, ...(doc.name ? { name: doc.name } : {}), label: doc.label };
}

export function toPlan(doc: PlanDoc): Plan {
  return {
    id: doc._id,
    label: doc.label,
    priceMinor: doc.priceMinor,
    currency: doc.currency,
    period: doc.period as PlanPeriod,
    highlighted: doc.highlighted ?? false,
  };
}
