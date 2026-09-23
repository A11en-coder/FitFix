import { db } from "../../server/db";
import type { ActiveMembership } from "../auth/role-policy";
import type { NotificationListInput, NotificationReadInput } from "./notification-schema";

type DbClient = typeof db;

export class NotificationNotFoundError extends Error {
  constructor() {
    super("Notification not found.");
    this.name = "NotificationNotFoundError";
  }
}

function toNotification(notification: {
  id: string;
  type: string;
  title: string;
  body: string;
  destination: string;
  readAt: Date | null;
  createdAt: Date;
}) {
  return notification;
}

export async function listNotifications(
  membership: ActiveMembership,
  input: NotificationListInput,
  database: DbClient = db,
) {
  const notifications = await database.notification.findMany({
    where: { gymId: membership.gymId, recipientMemberId: membership.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      destination: true,
      readAt: true,
      createdAt: true,
    },
  });
  const hasMore = notifications.length > input.limit;
  const page = hasMore ? notifications.slice(0, input.limit) : notifications;
  return {
    items: page.map(toNotification),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    unreadCount: await database.notification.count({
      where: { gymId: membership.gymId, recipientMemberId: membership.id, readAt: null },
    }),
  };
}

export async function markNotificationsRead(
  membership: ActiveMembership,
  input: NotificationReadInput,
  database: DbClient = db,
) {
  if (input.markAll) {
    await database.notification.updateMany({
      where: { gymId: membership.gymId, recipientMemberId: membership.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { marked: "all" as const };
  }
  const result = await database.notification.updateMany({
    where: { id: input.notificationId, gymId: membership.gymId, recipientMemberId: membership.id },
    data: { readAt: new Date() },
  });
  if (!result.count) throw new NotificationNotFoundError();
  return { marked: input.notificationId };
}
