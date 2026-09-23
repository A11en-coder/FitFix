import { NotificationType, Prisma } from "@prisma/client";

export type NotificationEvent =
  "FAULT_HIGH_SEVERITY" | "FAULT_ASSIGNED" | "FAULT_RESOLVED" | "FAULT_CLOSED" | "FAULT_REOPENED";

export async function persistNotification(
  tx: Prisma.TransactionClient,
  input: {
    gymId: string;
    recipientMemberId: string;
    faultId: string;
    reference: string;
    type: NotificationEvent;
    title: string;
    body: string;
    dedupeKey: string;
  },
) {
  const recipient = await tx.gymMember.findFirst({
    where: { id: input.recipientMemberId, gymId: input.gymId, status: "ACTIVE" },
    include: { user: { select: { email: true } } },
  });
  if (!recipient) return null;

  const notification = await tx.notification.create({
    data: {
      gymId: input.gymId,
      recipientMemberId: recipient.id,
      faultId: input.faultId,
      type: input.type as NotificationType,
      title: input.title,
      body: input.body,
      destination: `/faults/${input.reference}`,
      dedupeKey: input.dedupeKey,
    },
  });
  await tx.emailOutbox.create({
    data: {
      dedupeKey: `email:${input.dedupeKey}`,
      notificationId: notification.id,
      recipientEmail: recipient.user.email,
      templateKey: "fault-event",
      payload: {
        reference: input.reference,
        title: input.title,
        body: input.body,
        destination: `/faults/${input.reference}`,
      },
    },
  });
  return notification;
}
