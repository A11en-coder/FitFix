// this file defines the API route for handling Clerk webhooks related to identity reconciliation and onboarding.
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../server/db";
import { parseClerkWebhookEvent } from "../../../../features/auth/identity-reconciliation";
import {
  reconcileClerkWebhook,
  webhookErrorCode,
} from "../../../../features/auth/onboarding-service";
import { createRequestContext } from "../../../../server/request-context";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Create a request context for logging and tracing
  const requestContext = createRequestContext();
  let event;
  try {
    // Verify the webhook request and parse the Clerk webhook event
    event = parseClerkWebhookEvent(await verifyWebhook(request));
  } catch {
    return NextResponse.json(
      {
        code: "INVALID_WEBHOOK",
        message: "Webhook verification failed.",
        requestId: requestContext.requestId,
      },
      { status: 400 },
    );
  }

  // Check if the webhook event has already been processed to avoid duplicate processing
  const existing = await db.webhookEvent.findUnique({
    where: { provider_providerEventId: { provider: "CLERK", providerEventId: event.id } },
  });
  if (existing?.status === "PROCESSED") return NextResponse.json({ ok: true, duplicate: true });
  // Record the webhook event in the database with a status of "RECEIVED" to track its processing state
  if (existing)
    await db.webhookEvent.update({
      where: { id: existing.id },
      data: { status: "RECEIVED", errorCode: null },
    });
  else
    await db.webhookEvent.create({
      data: { provider: "CLERK", providerEventId: event.id, eventType: event.type },
    });

  try {
    await reconcileClerkWebhook(event.type, event.data);
    await db.webhookEvent.update({
      where: { provider_providerEventId: { provider: "CLERK", providerEventId: event.id } },
      data: { status: "PROCESSED", processedAt: new Date(), errorCode: null },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await db.webhookEvent.update({
      where: { provider_providerEventId: { provider: "CLERK", providerEventId: event.id } },
      data: { status: "FAILED", errorCode: webhookErrorCode(error) },
    });
    return NextResponse.json(
      {
        code: "WEBHOOK_PROCESSING_FAILED",
        message: "Webhook processing failed.",
        requestId: requestContext.requestId,
      },
      { status: 500 },
    );
  }
}
