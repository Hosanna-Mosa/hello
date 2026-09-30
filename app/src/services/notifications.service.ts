/**
 * The activity feed.
 *
 * Not push notifications — those are an OS permission primed after the first
 * match (A4). This is the in-app list of things that happened.
 *
 * AGAINST THE REAL API the server has no `/notifications` yet (it is in the
 * contract, not the backend). Rather than show the mock seed — strangers whose
 * ids resolve to nobody — the feed is built from what the server DOES have:
 * pending message requests and inbound likes. "Read" is everything up to the
 * last time the feed was opened, kept in memory, so a fresh launch shows the
 * still-pending ones as new again. Swap this for `GET /notifications` when it
 * lands.
 */

import { copy } from "@/copy";
import { SEEDED_LIKES } from "@/mocks/threads";

import { isMockMode, nextId, nowIso, request } from "./client";
import { likesService } from "./likes.service";
import type { AppNotification, NotificationKind } from "./types";

/**
 * The Chat tab, opened on its Requests segment. A plain string: route groups
 * like `(tabs)` do not appear in a URL, and the query becomes a param.
 */
export const REQUESTS_LINK = "/chat?segment=requests";
const LIKES_LINK = "/likes";

/** Enough to be "recent" without paging a list nobody scrolls. */
const FEED_LIMIT = 30;

function seed(): AppNotification[] {
  return SEEDED_LIKES.slice(0, 4).map((like, index) => ({
    id: `notification-${index + 1}`,
    kind: like.note ? ("messageRequest" as NotificationKind) : ("newLike" as NotificationKind),
    actorId: like.fromUserId,
    body: like.note ? copy.notifications.requestBody : copy.notifications.likeBody,
    deepLink: like.note ? REQUESTS_LINK : LIKES_LINK,
    read: index > 1,
    createdAt: like.createdAt,
  }));
}

let notifications: AppNotification[] = seed();

/** Real mode: when the feed was last opened, in ms. Everything older is read. */
let lastSeenAt = 0;

function newestFirst(a: AppNotification, b: AppNotification): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

async function fromServer(): Promise<AppNotification[]> {
  const [requests, likes] = await Promise.all([
    likesService.listRequests("pending"),
    // Inbound likes are a nicety here; a failure must not cost the requests.
    likesService.listInboundLikes().catch(() => []),
  ]);

  const requestItems = requests.map<AppNotification>((each) => ({
    id: `request-${each.id}`,
    kind: "messageRequest",
    actorId: each.fromUserId,
    body: copy.notifications.requestBody,
    deepLink: REQUESTS_LINK,
    read: new Date(each.createdAt).getTime() <= lastSeenAt,
    createdAt: each.createdAt,
  }));

  // A like with a note IS a request — listing both would say it twice.
  const requestLikeIds = new Set(requests.map((each) => each.likeId));
  const likeItems = likes
    .filter((each) => !each.note && !requestLikeIds.has(each.id))
    .map<AppNotification>((each) => ({
      id: `like-${each.id}`,
      kind: "newLike",
      actorId: each.fromUserId,
      body: copy.notifications.likeBody,
      deepLink: LIKES_LINK,
      read: new Date(each.createdAt).getTime() <= lastSeenAt,
      createdAt: each.createdAt,
    }));

  return [...requestItems, ...likeItems].sort(newestFirst).slice(0, FEED_LIMIT);
}

export const notificationsService = {
  async list(): Promise<AppNotification[]> {
    if (!isMockMode()) return fromServer();

    return request(() => [...notifications].sort(newestFirst));
  },

  async unreadCount(): Promise<number> {
    if (!isMockMode()) return (await fromServer()).filter((n) => !n.read).length;

    return request(() => notifications.filter((n) => !n.read).length);
  },

  async markAllRead(): Promise<void> {
    if (!isMockMode()) {
      lastSeenAt = Date.now();
      return;
    }

    return request(() => {
      notifications = notifications.map((n) => ({ ...n, read: true }));
    });
  },

  async add(
    kind: NotificationKind,
    body: string,
    actorId?: string,
    deepLink?: string,
  ): Promise<AppNotification> {
    return request(() => {
      const notification: AppNotification = {
        id: nextId("notification"),
        kind,
        actorId,
        body,
        deepLink,
        read: false,
        createdAt: nowIso(),
      };
      notifications = [notification, ...notifications];
      return { ...notification };
    });
  },

  __reset(): void {
    notifications = seed();
    lastSeenAt = 0;
  },
};
