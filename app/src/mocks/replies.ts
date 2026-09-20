/**
 * Scripted auto-replies.
 *
 * The demo needs a conversation to feel alive without a backend. Each reply is
 * deliberately generic enough to follow almost anything the operator types, and
 * strictly platonic — a flirty auto-reply would contradict the entire product
 * in the one place a client is most likely to be looking.
 *
 * Replies cycle per thread rather than being random, so a demo can be walked
 * through twice and behave the same way both times.
 */

export type ReplyScript = {
  /** Milliseconds to "type" before the message lands. */
  typingMs: number;
  body: string;
};

export const REPLY_SCRIPTS: ReplyScript[] = [
  { typingMs: 1800, body: "Ha, fair enough." },
  { typingMs: 2400, body: "That works for me — what time were you thinking?" },
  { typingMs: 2000, body: "Honestly I was hoping you'd say that." },
  { typingMs: 2600, body: "Let me check and come back to you this evening." },
  { typingMs: 1600, body: "Good shout. I hadn't thought of that." },
  { typingMs: 2800, body: "I'm around most of the weekend if that helps." },
  { typingMs: 2200, body: "Sounds good. I'll bring snacks." },
  { typingMs: 1900, body: "Deal." },
];

/** Deterministic: the same thread and turn always produce the same reply. */
export function replyFor(threadId: string, turn: number): ReplyScript {
  const seed = [...threadId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return REPLY_SCRIPTS[(seed + turn) % REPLY_SCRIPTS.length];
}
