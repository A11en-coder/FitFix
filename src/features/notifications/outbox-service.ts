import { OutboxStatus, Prisma } from "@prisma/client";
import { db } from "../../server/db";
import { sendOutboxEmail } from "./email-service";

type DbClient = typeof db;
const MAX_ATTEMPTS = 5;

export async function reconcileEmailOutbox(limit = 25, database: DbClient = db) {
  const candidates = await database.emailOutbox.findMany({
    where: {
      status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] },
      nextAttemptAt: { lte: new Date() },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
    include: { notification: true },
  });
  const result = { claimed: 0, sent: 0, failed: 0 };
  for (const candidate of candidates) {
    const claimed = await database.emailOutbox.updateMany({
      where: { id: candidate.id, status: candidate.status, attempts: candidate.attempts },
      data: { status: OutboxStatus.PROCESSING, attempts: { increment: 1 } },
    });
    if (!claimed.count) continue;
    result.claimed += 1;
    try {
      const providerMessageId = await sendOutboxEmail(candidate);
      await database.emailOutbox.update({
        where: { id: candidate.id },
        data: {
          status: OutboxStatus.SENT,
          providerMessageId,
          sentAt: new Date(),
          lastErrorCode: null,
        },
      });
      result.sent += 1;
    } catch (error) {
      const delayMinutes = Math.min(60, 2 ** candidate.attempts);
      await database.emailOutbox.update({
        where: { id: candidate.id },
        data: {
          status: OutboxStatus.FAILED,
          nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
          lastErrorCode: error instanceof Error ? error.name : "EMAIL_SEND_FAILED",
        },
      });
      result.failed += 1;
    }
  }
  return result;
}

export function outboxErrorCode(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return `DATABASE_${error.code}`;
  return "OUTBOX_RECONCILE_FAILED";
}
