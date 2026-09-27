/**
 * A voice call.
 *
 * VOICE ONLY, and mocked end to end (PLAN A17): no audio, no mic permission,
 * no WebRTC. What is real is the RECORD — who called whom, when, how it ended
 * — because that is what writes the "Voice call · 2:14" line into the thread
 * and what a missed-call notification is built from.
 *
 * `direction` is deliberately NOT stored. It is viewer-relative: the same call
 * is outgoing to the caller and incoming to the callee, so storing one of them
 * would be wrong for the other. It is derived in the serializer from
 * `callerId`.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const callSchema = new Schema(
  {
    threadId: { type: Schema.Types.ObjectId, ref: "Thread", required: true },
    callerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    calleeId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    startedAt: { type: Date, default: () => new Date() },
    answeredAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    durationSec: { type: Number, default: 0, min: 0 },

    /** Pessimistic default: a call that vanishes mid-ring was cancelled. */
    outcome: {
      type: String,
      enum: ["completed", "missed", "declined", "cancelled"],
      default: "cancelled",
    },
  },
  { strict: "throw", strictQuery: true },
);

callSchema.index({ threadId: 1, startedAt: -1 }, { name: "thread_calls" });
/** Missed-call surfaces are always "calls TO me". */
callSchema.index({ calleeId: 1, startedAt: -1 }, { name: "incoming_calls" });

export type CallDoc = HydratedDocument<InferSchemaType<typeof callSchema>>;
export const CallModel = model("Call", callSchema);
