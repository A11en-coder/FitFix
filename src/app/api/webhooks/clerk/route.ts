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
import { withRequestId } from "../../../../server/http";
import { logError, logInfo, logWarn } from "../../../../server/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Create a request context for logging and tracing
  const requestContext = createRequestContext();
  let event;
  try {
    // Verify the webhook request and parse the Clerk webhook event
    event = parseClerkWebhookEvent(await verifyWebhook(request));
  } catch (error) {
    logWarn("clerk_webhook_verification_failed", {
      requestId: requestContext.requestId,
      provider: "CLERK",
      error,
    });
    return NextResponse.json(
      {
        code: "INVALID_WEBHOOK",
        message: "Webhook verification or payload validation failed.",
        requestId: requestContext.requestId,
      },
      { status: 400 },
    );
  }

  const providerEventId = request.headers.get("svix-id");
  if (!providerEventId)
    return NextResponse.json(
      {
        code: "INVALID_WEBHOOK",
        message: "Webhook delivery ID is missing.",
        requestId: requestContext.requestId,
      },
      { status: 400 },
    );

  // Check if the webhook event has already been processed to avoid duplicate processing
  const existing = await db.webhookEvent.findUnique({
    where: { provider_providerEventId: { provider: "CLERK", providerEventId } },
  });
  if (existing?.status === "PROCESSED") {
    logInfo("clerk_webhook_duplicate", {
      requestId: requestContext.requestId,
      provider: "CLERK",
      providerEventId,
      eventType: event.type,
    });
    return withRequestId(
      NextResponse.json({ ok: true, duplicate: true, requestId: requestContext.requestId }),
      requestContext.requestId,
    );
  }
  // Record the webhook event in the database with a status of "RECEIVED" to track its processing state
  if (existing)
    await db.webhookEvent.update({
      where: { id: existing.id },
      data: { status: "RECEIVED", errorCode: null },
    });
  else
    await db.webhookEvent.create({
      data: { provider: "CLERK", providerEventId, eventType: event.type },
    });

  try {
    await reconcileClerkWebhook(event.type, event.data);
    await db.webhookEvent.update({
      where: { provider_providerEventId: { provider: "CLERK", providerEventId } },
      data: { status: "PROCESSED", processedAt: new Date(), errorCode: null },
    });
    logInfo("clerk_webhook_processed", {
      requestId: requestContext.requestId,
      provider: "CLERK",
      providerEventId,
      eventType: event.type,
      result: "PROCESSED",
    });
    return withRequestId(
      NextResponse.json({ ok: true, requestId: requestContext.requestId }),
      requestContext.requestId,
    );
  } catch (error) {
    await db.webhookEvent.update({
      where: { provider_providerEventId: { provider: "CLERK", providerEventId } },
      data: { status: "FAILED", errorCode: webhookErrorCode(error) },
    });
    logError("clerk_webhook_processing_failed", {
      requestId: requestContext.requestId,
      provider: "CLERK",
      providerEventId,
      eventType: event.type,
      result: "FAILED",
      error,
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
