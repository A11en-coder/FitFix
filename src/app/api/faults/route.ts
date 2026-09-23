import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthorizationError } from "../../../features/auth/role-policy";
import { findActiveMembership } from "../../../features/auth/staff-service";
import {
  faultErrorCode,
  faultSubmissionErrorCode,
  listFaults,
  submitFault,
} from "../../../features/faults/fault-service";
import { faultListQuerySchema } from "../../../features/faults/review-schema";
import { faultSubmissionSchema } from "../../../features/faults/submission-schema";
import { createRequestContext } from "../../../server/request-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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
  try {
    const membership = await findActiveMembership(userId);
    if (!membership) throw new AuthorizationError("An active gym membership is required.");
    const input = faultListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const result = await listFaults(membership, input);
    return NextResponse.json({ ...result, requestId: requestContext.requestId });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid fault filters.",
          fieldErrors: error.flatten().fieldErrors,
          requestId: requestContext.requestId,
        },
        { status: 400 },
      );
    const code = faultErrorCode(error);
    const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json(
      {
        code,
        message: error instanceof Error ? error.message : "Faults could not be loaded.",
        requestId: requestContext.requestId,
      },
      { status },
    );
  }
}

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
  try {
    const membership = await findActiveMembership(userId);
    if (!membership) throw new AuthorizationError("An active gym membership is required.");
    const idempotencyKey = request.headers.get("Idempotency-Key") ?? "";
    // validate the request body and submit the fault
    const result = await submitFault(
      faultSubmissionSchema.parse(await request.json()),
      idempotencyKey,
      membership,
      requestContext.requestId,
    );
    return NextResponse.json(
      { data: result, requestId: requestContext.requestId },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Please complete the required fault details.",
          fieldErrors: error.flatten().fieldErrors,
          requestId: requestContext.requestId,
        },
        { status: 400 },
      );
    const code = faultSubmissionErrorCode(error);
    const status =
      code === "FORBIDDEN"
        ? 403
        : code === "NOT_FOUND"
          ? 404
          : code === "FAULT_SUBMISSION_CONFLICT"
            ? 409
            : 500;
    return NextResponse.json(
      {
        code,
        message: error instanceof Error ? error.message : "The fault could not be submitted.",
        requestId: requestContext.requestId,
      },
      { status },
    );
  }
}
