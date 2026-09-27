/**
 * A conversation.
 *
 * Two deliberate deviations from the wire shape, both because `Thread` is
 * VIEWER-RELATIVE and a document is not:
 *
 * 1. `unreadCount` and `muted` are per participant, held in `participants[]`.
 *    The serializer picks the caller's entry. One shared `unreadCount` would
 *    mean reading your messages clears the other person's badge.
 * 2. `lastMessage` is denormalised. `GET /threads` renders a preview row per
 *    thread, and the app's own `ThreadPreview` comment already flags the N+1 —
 *    so the list is answerable in one query instead of one-per-thread.
 *
 * `lastReadAt` / `lastDeliveredAt` are what `Message.status` is DERIVED from.
 * Storing a status per message would make marking 200 messages read into 200
 * writes; this makes it one.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const participantSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    unreadCount: { type: Number, default: 0, min: 0 },
    muted: { type: Boolean, default: false },
    lastReadAt: { type: Date, default: null },
    lastDeliveredAt: { type: Date, default: null },
  },
  { _id: false },
);

const threadSchema = new Schema(
  {
    matchId: { type: Schema.Types.ObjectId, ref: "Match", required: true },
    participantIds: { type: [Schema.Types.ObjectId], required: true },
    participants: { type: [participantSchema], required: true },
    lastMessageAt: { type: Date, default: () => new Date() },
    lastMessage: {
      type: new Schema(
        {
          messageId: { type: Schema.Types.ObjectId, required: true },
          senderId: { type: Schema.Types.ObjectId, required: true },
          kind: { type: String, enum: ["text", "system"], required: true },
          body: { type: String, required: true, maxlength: 2000 },
          createdAt: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { strict: "throw", strictQuery: true, timestamps: true },
);

threadSchema.index({ matchId: 1 }, { unique: true, name: "thread_match_unique" });
/** `GET /threads` — exactly the list's sort order. */
threadSchema.index({ participantIds: 1, lastMessageAt: -1 }, { name: "user_threads" });

export type ThreadDoc = HydratedDocument<InferSchemaType<typeof threadSchema>>;
export const ThreadModel = model("Thread", threadSchema);
