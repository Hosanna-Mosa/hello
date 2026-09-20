/**
 * Seeded conversations, likes and message requests (A8).
 *
 * 9 threads, 6 inbound likes — 3 of which carry a note and so appear in the
 * Requests segment as pending. The ninth thread is a match with nothing said
 * yet, which is what the new-matches carousel shows.
 *
 * The match gate is modelled honestly: every thread has a `Match` behind it,
 * and there is no thread anywhere without one. A request is not a conversation
 * until it is accepted, at which point the note becomes the thread's first
 * message (A18).
 */

import type {
  Like,
  Match,
  Message,
  MessageRequest,
  Thread,
} from "@/services/types";

import { CURRENT_USER } from "./profiles";

const ME = CURRENT_USER.id;
/**
 * Anchored to the real clock at module load, NOT a hardcoded date.
 *
 * With a fixed anchor, anything the user creates during a session gets a real
 * timestamp and sorts *before* the seed data — a message you just sent lands
 * halfway up the conversation. Every relative time would also read "300d" once
 * the calendar moved past the constant.
 *
 * Ordering and content stay fully deterministic; only the absolute instants
 * float, which is what makes "8m ago" true on any day.
 */
const NOW = Date.now();

const minutesAgo = (n: number) => new Date(NOW - n * 60_000).toISOString();
const hoursAgo = (n: number) => minutesAgo(n * 60);
const daysAgo = (n: number) => hoursAgo(n * 24);

/** [partner, minutes since last message, messages as [fromMe, body]] */
const CONVERSATIONS: [string, number, [boolean, string][]][] = [
  ["user-01", 8, [
    [false, "That hike you mentioned — is it the one along the ridge?"],
    [true, "That's the one. Takes about four hours at a normal pace."],
    [false, "I am not a normal pace. Five hours?"],
    [true, "Five hours and a long lunch. Deal."],
  ]],
  ["user-02", 45, [
    [true, "Quiz night Thursday? I need someone who knows sport."],
    [false, "I know almost no sport but I am very confident."],
    [true, "Honestly that's more useful."],
  ]],
  ["user-03", 180, [
    [false, "Have you been to the new bakery on the corner?"],
    [true, "Twice this week. The cardamom buns are the correct answer."],
    [false, "Noted. Going tomorrow."],
  ]],
  ["user-04", 400, [
    [false, "Climbing session Saturday morning if you're around?"],
    [true, "I'm extremely rusty but yes."],
  ]],
  ["user-05", 1500, [
    [true, "How did the pottery class go?"],
    [false, "I made something that is technically a bowl."],
    [true, "Technically a bowl is still a bowl."],
  ]],
  ["user-06", 2600, [
    [false, "Supper club this month has two spare seats."],
    [true, "I'm in. What can I bring?"],
    [false, "Something for pudding and low expectations."],
  ]],
  ["user-07", 4300, [
    [true, "Did you get to that comedy night in the end?"],
    [false, "I did. Two good acts, one disaster."],
  ]],
  ["user-08", 8000, [
    [false, "Book club picked the 600-page one. I blame you."],
    [true, "I abstained. Loudly."],
  ]],
];

const matches: Match[] = [];
const threads: Thread[] = [];
const messages: Message[] = [];

CONVERSATIONS.forEach(([partnerId, lastMinutes, lines], index) => {
  const matchId = `match-${index + 1}`;
  const threadId = `thread-${index + 1}`;

  matches.push({
    id: matchId,
    userIds: [ME, partnerId],
    threadId,
    createdAt: daysAgo(14 - index),
    endedAt: null,
  });

  lines.forEach(([fromMe, body], line) => {
    // Space the messages out backwards from the last one.
    const offset = lastMinutes + (lines.length - 1 - line) * 7;
    messages.push({
      id: `${threadId}-m${line + 1}`,
      threadId,
      senderId: fromMe ? ME : partnerId,
      kind: "text",
      body,
      status: fromMe ? "read" : "delivered",
      // One reaction in the seed so the chat surface shows the feature.
      reactions:
        index === 0 && line === 3 ? [{ emoji: "😄", userId: partnerId }] : [],
      createdAt: minutesAgo(offset),
    });
  });

  threads.push({
    id: threadId,
    matchId,
    participantIds: [ME, partnerId],
    lastMessageAt: minutesAgo(lastMinutes),
    // The two most recent conversations have something unread.
    unreadCount: index === 0 ? 2 : index === 2 ? 1 : 0,
    muted: false,
  });
});

/**
 * One match with nothing said yet.
 *
 * This is what the new-matches carousel is for, and without a seeded example
 * the rail only appears after accepting a request — a feature nobody sees on
 * first open. Its thread exists and is empty, which is also the fixture behind
 * the "no messages in a thread" state.
 */
const FRESH_PARTNER = "user-15";

matches.push({
  id: "match-fresh",
  userIds: [ME, FRESH_PARTNER],
  threadId: "thread-fresh",
  createdAt: minutesAgo(20),
  endedAt: null,
});

threads.push({
  id: "thread-fresh",
  matchId: "match-fresh",
  participantIds: [ME, FRESH_PARTNER],
  lastMessageAt: minutesAgo(20),
  unreadCount: 0,
  muted: false,
});

export const SEEDED_MATCHES: Match[] = matches;
export const SEEDED_THREADS: Thread[] = threads;
export const SEEDED_MESSAGES: Message[] = messages;

/**
 * Inbound likes. The first three carry a note, so they are also pending
 * requests; the rest are plain likes and show only on the Likes grid.
 */
const INBOUND: [string, string | undefined][] = [
  ["user-09", "We matched on three of the same walks — where do you usually start?"],
  ["user-10", "Fellow slow runner here. Saturday mornings?"],
  ["user-11", "Your bio says you test recipes on people. I volunteer."],
  ["user-12", undefined],
  ["user-13", undefined],
  ["user-14", undefined],
];

export const SEEDED_LIKES: Like[] = INBOUND.map(([fromUserId, note], index) => ({
  id: `like-${index + 1}`,
  fromUserId,
  toUserId: ME,
  note,
  createdAt: hoursAgo(2 + index * 9),
}));

export const SEEDED_REQUESTS: MessageRequest[] = SEEDED_LIKES.filter(
  (like) => like.note,
).map((like, index) => ({
  id: `request-${index + 1}`,
  likeId: like.id,
  fromUserId: like.fromUserId,
  toUserId: ME,
  note: like.note as string,
  status: "pending",
  createdAt: like.createdAt,
  resolvedAt: null,
}));
