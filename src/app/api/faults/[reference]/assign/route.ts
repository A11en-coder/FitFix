import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthorizationError } from "../../../../../features/auth/role-policy";
import { findActiveMembership } from "../../../../../features/auth/staff-service";
import {
  assignFault,
  faultAssignmentErrorCode,
} from "../../../../../features/faults/assignment-service";
import { getFault } from "../../../../../features/faults/fault-service";
import { faultAssignmentSchema } from "../../../../../features/faults/assignment-schema";
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
    await assignFault(
      reference,
      faultAssignmentSchema.parse(await request.json()),
      membership,
      requestContext.requestId,
    );
    const fault = await getFault(reference, membership);
    return NextResponse.json({ fault, requestId: requestContext.requestId });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Choose an assignee and provide a valid target date.",
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
    const code = faultAssignmentErrorCode(error);
    const status = code === "NOT_FOUND" ? 404 : code === "ASSIGNMENT_CONFLICT" ? 409 : 500;
    return NextResponse.json(
      {
        code,
        message: error instanceof Error ? error.message : "The fault could not be assigned.",
        requestId: requestContext.requestId,
      },
      { status },
    );
  }
}
