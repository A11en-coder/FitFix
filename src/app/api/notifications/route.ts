import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthorizationError } from "../../../features/auth/role-policy";
import { findActiveMembership } from "../../../features/auth/staff-service";
import {
  listNotifications,
  markNotificationsRead,
  NotificationNotFoundError,
} from "../../../features/notifications/notification-query-service";
import {
  notificationListSchema,
  notificationReadSchema,
} from "../../../features/notifications/notification-schema";
import { createRequestContext } from "../../../server/request-context";

export const dynamic = "force-dynamic";

async function context() {
  const requestContext = createRequestContext();
  const { userId } = await auth();
  return { requestContext, userId };
}

export async function GET(request: Request) {
  const { requestContext, userId } = await context();
  if (!userId)
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "Authentication required.",
        requestId: requestContext.requestId,
      },
      { status: 401 },
    );
  try {
    const membership = await findActiveMembership(userId);
    if (!membership) throw new AuthorizationError("An active gym membership is required.");
    const result = await listNotifications(
      membership,
      notificationListSchema.parse(Object.fromEntries(new URL(request.url).searchParams)),
    );
    return NextResponse.json({ ...result, requestId: requestContext.requestId });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid notification filters.",
          requestId: requestContext.requestId,
        },
        { status: 400 },
      );
    const status = error instanceof AuthorizationError ? 403 : 500;
    return NextResponse.json(
      {
        code: status === 403 ? "FORBIDDEN" : "NOTIFICATIONS_FAILED",
        message: error instanceof Error ? error.message : "Notifications could not be loaded.",
        requestId: requestContext.requestId,
      },
      { status },
    );
  }
}

export async function PATCH(request: Request) {
  const { requestContext, userId } = await context();
  if (!userId)
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "Authentication required.",
        requestId: requestContext.requestId,
      },
      { status: 401 },
    );
  try {
    const membership = await findActiveMembership(userId);
    if (!membership) throw new AuthorizationError("An active gym membership is required.");
    const result = await markNotificationsRead(
      membership,
      notificationReadSchema.parse(await request.json()),
    );
    return NextResponse.json({ ...result, requestId: requestContext.requestId });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Provide a notification ID or markAll.",
          requestId: requestContext.requestId,
        },
        { status: 400 },
      );
    const status =
      error instanceof AuthorizationError
        ? 403
        : error instanceof NotificationNotFoundError
          ? 404
          : 500;
    return NextResponse.json(
      {
        code: status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : "NOTIFICATIONS_FAILED",
        message: error instanceof Error ? error.message : "Notifications could not be updated.",
        requestId: requestContext.requestId,
      },
      { status },
    );
  }
}
