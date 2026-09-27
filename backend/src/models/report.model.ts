/**
 * A moderation record.
 *
 * RETAINED PAST ERASURE of either party, which is why the evidence is a
 * SNAPSHOT rather than a reference: unmatching deletes the messages and
 * erasure removes the profile, so a report that pointed at them would be an
 * empty record of a real harm by the time anyone read it.
 *
 * Nothing here is ever shown to the reporter. They are not told what happened
 * to the person they reported — standard practice, and the safest thing for
 * them.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const REPORT_REASONS = [
  // First deliberately. This product is platonic-only, and the reason list is
  // where that is enforced rather than merely stated (PLAN §1).
  "romanticAdvance",
  "harassment",
  "inappropriateContent",
  "spamOrScam",
  "fakeProfile",
  "underage",
  "other",
] as const;

/** What the reported account looked like when it was reported. */
const snapshotSchema = new Schema(
  {
    name: { type: String, default: "" },
    bio: { type: String, default: "" },
    phoneHmac: { type: String, default: null },
    /** The last few messages of the shared thread, if there was one. */
    messages: {
      type: [
        new Schema(
          {
            senderId: { type: Schema.Types.ObjectId, required: true },
            body: { type: String, required: true, maxlength: 2000 },
            createdAt: { type: Date, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { _id: false },
);

const reportSchema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reportedUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, maxlength: 1000 },
    alsoBlocked: { type: Boolean, default: false },
    /** Frozen at report time — see the note above. Never repopulated. */
    snapshot: { type: snapshotSchema, default: () => ({}) },
    status: { type: String, enum: ["open", "reviewed"], default: "open" },
  },
  { strict: "throw", strictQuery: true, timestamps: true },
);

/** Moderation reads by subject: "everything filed against this account". */
reportSchema.index({ reportedUserId: 1, createdAt: -1 }, { name: "reports_by_subject" });
reportSchema.index({ reporterId: 1, createdAt: -1 }, { name: "reports_by_reporter" });

export type ReportDoc = HydratedDocument<InferSchemaType<typeof reportSchema>>;
export const ReportModel = model("Report", reportSchema);
