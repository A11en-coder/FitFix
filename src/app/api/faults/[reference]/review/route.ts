import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthorizationError } from "../../../../../features/auth/role-policy";
import { findActiveMembership } from "../../../../../features/auth/staff-service";
import { faultErrorCode, reviewFault } from "../../../../../features/faults/fault-service";
import { faultReviewSchema } from "../../../../../features/faults/review-schema";
import { createRequestContext } from "../../../../../server/request-context";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
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
    const { reference } = await params;
    const fault = await reviewFault(
      reference,
      faultReviewSchema.parse(await request.json()),
      membership,
      requestContext.requestId,
    );
    return NextResponse.json({ fault, requestId: requestContext.requestId });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Severity, equipment status, and version are required.",
          fieldErrors: error.flatten().fieldErrors,
          requestId: requestContext.requestId,
        },
        { status: 400 },
      );
    const code = faultErrorCode(error);
    const status =
      code === "FORBIDDEN"
        ? 403
        : code === "NOT_FOUND"
          ? 404
          : code === "FAULT_REVIEW_CONFLICT"
            ? 409
            : 500;
    return NextResponse.json(
      {
        code,
        message: error instanceof Error ? error.message : "Fault could not be reviewed.",
        requestId: requestContext.requestId,
      },
      { status },
    );
  }
}
