/**
 * The activity feed.
 *
 * Not push notifications — those are an OS permission primed after the first
 * match (A4). This is the in-app list of things that happened.
 */

import { SEEDED_LIKES } from "@/mocks/threads";

import { nextId, nowIso, request } from "./client";
import type { AppNotification, NotificationKind } from "./types";

function seed(): AppNotification[] {
  return SEEDED_LIKES.slice(0, 4).map((like, index) => ({
    id: `notification-${index + 1}`,
    kind: like.note ? ("messageRequest" as NotificationKind) : ("newLike" as NotificationKind),
    actorId: like.fromUserId,
    body: like.note ? "sent you a message request" : "liked your profile",
    deepLink: like.note ? "/(tabs)/chat" : "/likes",
    read: index > 1,
    createdAt: like.createdAt,
  }));
}

let notifications: AppNotification[] = seed();

export const notificationsService = {
  async list(): Promise<AppNotification[]> {
    return request(() =>
      [...notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    );
  },

  async unreadCount(): Promise<number> {
    return request(() => notifications.filter((n) => !n.read).length);
  },

  async markAllRead(): Promise<void> {
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
  },
};
