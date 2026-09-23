import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthorizationError } from "../../../../features/auth/role-policy";
import { findActiveMembership } from "../../../../features/auth/staff-service";
import {
  assertDraftMediaCapacity,
  FaultDraftConflictError,
  getFaultDraft,
} from "../../../../features/faults/draft-service";
import { createCloudinaryUploadSignature } from "../../../../features/faults/cloudinary-service";
import { uploadSignatureSchema } from "../../../../features/faults/draft-schema";
import { withRequestId } from "../../../../server/http";
import { logWarn } from "../../../../server/logger";
import { consumeRateLimit } from "../../../../server/rate-limit";
import { createRequestContext } from "../../../../server/request-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestContext = createRequestContext();
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "Authentication required.",
        requestId: requestContext.requestId,
      },
      { status: 401 },
    );
  const rateLimit = consumeRateLimit(`upload-signature:${userId}`, { limit: 30, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    logWarn("rate_limit_exceeded", {
      requestId: requestContext.requestId,
      route: "/api/uploads/signature",
      action: "upload_signature",
      actorId: userId,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return withRequestId(
      NextResponse.json(
        {
          code: "RATE_LIMITED",
          message: "Too many upload attempts. Please retry later.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
          requestId: requestContext.requestId,
        },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      ),
      requestContext.requestId,
    );
  }
  try {
    const membership = await findActiveMembership(userId);
    if (!membership) throw new AuthorizationError("An active gym membership is required.");
    const input = uploadSignatureSchema.parse(await request.json());
    await getFaultDraft(input.draftId, membership);
    await assertDraftMediaCapacity(input.draftId, membership);
    return withRequestId(
      NextResponse.json(createCloudinaryUploadSignature(membership.gymId, input.draftId)),
      requestContext.requestId,
    );
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Please check the upload details.",
          fieldErrors: error.flatten().fieldErrors,
          requestId: requestContext.requestId,
        },
        { status: 400 },
      );
    const status =
      error instanceof AuthorizationError
        ? 403
        : error instanceof FaultDraftConflictError
          ? 409
          : error instanceof Error && error.message === "Fault draft not found."
            ? 404
            : 500;
    return NextResponse.json(
      {
        code:
          status === 500
            ? "UPLOAD_CONFIGURATION_ERROR"
            : status === 404
              ? "NOT_FOUND"
              : "FORBIDDEN",
        message:
          error instanceof Error ? error.message : "The upload signature could not be created.",
        requestId: requestContext.requestId,
      },
      { status },
    );
  }
}
