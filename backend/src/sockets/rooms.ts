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

/**
 * Support. The same durable/ephemeral split, across TWO namespaces: the app's
 * users are on `/`, the panel's operators on `/admin`.
 *
 * `support:<id>`   whoever has that ticket open, in either namespace. Typing
 *                  only — rooms are per namespace, so emitters send to both.
 * `admins`         every connected operator (in `/admin`). Durable support
 *                  events go here, so every open panel's queue stays live.
 * `adminsess:<jti>` one operator session's sockets, so signing out can close
 *                  exactly those.
 */
export const supportRoom = (ticketId: string): string => `support:${ticketId}`;
export const ADMINS_ROOM = "admins";
export const adminSessionRoom = (jti: string): string => `adminsess:${jti}`;
export const ADMIN_NAMESPACE = "/admin";
