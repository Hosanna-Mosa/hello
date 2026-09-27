/**
 * Two room types, and the split matters.
 *
 * `user:<id>`    every device that user is signed in on. DURABLE events go
 *                here — a new message, a new match — so they arrive whether or
 *                not the relevant screen is open.
 *
 * `thread:<id>`  only the people currently looking at that conversation.
 *                EPHEMERAL signals go here: typing is meaningless to someone
 *                who is not on the screen, and sending it to their other
 *                devices is pure noise.
 */

export const userRoom = (userId: string): string => `user:${userId}`;
export const threadRoom = (threadId: string): string => `thread:${threadId}`;
