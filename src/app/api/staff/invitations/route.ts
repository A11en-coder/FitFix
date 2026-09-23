// this file defines the API route for inviting staff members to a gym using Clerk for authentication and authorization. It handles the POST request to create a staff invitation, validates the input using Zod, checks for an active gym membership, and manages errors related to validation, authorization, and conflicts.

import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthorizationError } from "../../../../features/auth/role-policy";
import {
  findActiveMembership,
  inviteStaff,
  StaffConflictError,
} from "../../../../features/auth/staff-service";
import { staffInvitationSchema } from "../../../../features/auth/staff-schema";
import { withRequestId } from "../../../../server/http";
import { logError, logInfo, logWarn } from "../../../../server/logger";
import { consumeRateLimit } from "../../../../server/rate-limit";
import { createRequestContext } from "../../../../server/request-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Create a request context for logging and tracing
  const requestContext = createRequestContext();

  // Authenticate the user using Clerk
  const { userId } = await auth();
  if (!userId)
    return withRequestId(
      NextResponse.json(
        {
          code: "UNAUTHENTICATED",
          message: "Authentication required.",
          requestId: requestContext.requestId,
        },
        { status: 401 },
      ),
      requestContext.requestId,
    );

  const rateLimit = consumeRateLimit(`staff-invitation:${userId}`, { limit: 10, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    logWarn("rate_limit_exceeded", {
      requestId: requestContext.requestId,
      route: "/api/staff/invitations",
      action: "staff_invitation",
      actorId: userId,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return withRequestId(
      NextResponse.json(
        {
          code: "RATE_LIMITED",
          message: "Too many invitation attempts. Please retry later.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
          requestId: requestContext.requestId,
        },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      ),
      requestContext.requestId,
    );
  }

  // Retrieve the Idempotency-Key from the request headers to prevent duplicate invitations
  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!idempotencyKey)
    return withRequestId(
      NextResponse.json(
        {
          code: "MISSING_IDEMPOTENCY_KEY",
          message: "Idempotency-Key is required.",
          requestId: requestContext.requestId,
        },
        { status: 400 },
      ),
      requestContext.requestId,
    );
  try {
    // Parse and validate the request body using the staff invitation schema
    const input = staffInvitationSchema.parse(await request.json());

    // Check if the user has an active gym membership before allowing them to invite staff
    const membership = await findActiveMembership(userId);
    if (!membership) throw new AuthorizationError("An active gym membership is required.");

    // Create the staff invitation using the inviteStaff service function
    const invitation = await inviteStaff(
      input,
      idempotencyKey,
      membership,
      (await clerkClient()).organizations,
      requestContext.requestId,
    );
    logInfo("staff_invitation_created", {
      requestId: requestContext.requestId,
      route: "/api/staff/invitations",
      actorId: userId,
      invitationId: invitation.id,
      role: invitation.role,
    });
    return withRequestId(
      NextResponse.json(
        {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        },
        { status: 202 },
      ),
      requestContext.requestId,
    );
  } catch (error) {
    logError("staff_invitation_failed", {
      requestId: requestContext.requestId,
      route: "/api/staff/invitations",
      actorId: userId,
      error,
    });
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Please check the invitation details.",
          fieldErrors: error.flatten().fieldErrors,
          requestId: requestContext.requestId,
        },
        { status: 400 },
      );
    if (error instanceof AuthorizationError)
      return NextResponse.json(
        { code: "FORBIDDEN", message: error.message, requestId: requestContext.requestId },
        { status: 403 },
      );
    if (error instanceof StaffConflictError)
      return NextResponse.json(
        { code: "STAFF_CONFLICT", message: error.message, requestId: requestContext.requestId },
        { status: 409 },
      );
    return NextResponse.json(
      {
        code: "INVITATION_FAILED",
        message: "The invitation could not be created.",
        requestId: requestContext.requestId,
      },
      { status: 500 },
    );
  }
}
