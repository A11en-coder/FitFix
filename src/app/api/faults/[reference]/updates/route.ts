import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthorizationError } from "../../../../../features/auth/role-policy";
import { findActiveMembership } from "../../../../../features/auth/staff-service";
import {
  addFaultUpdate,
  faultLifecycleErrorCode,
} from "../../../../../features/faults/lifecycle-service";
import { faultUpdateSchema } from "../../../../../features/faults/lifecycle-schema";
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
    const result = await addFaultUpdate(
      reference,
      faultUpdateSchema.parse(await request.json()),
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
          message: "A valid update and fault version are required.",
          fieldErrors: error.flatten().fieldErrors,
          requestId: requestContext.requestId,
        },
        { status: 400 },
      );
    const code = faultLifecycleErrorCode(error);
    const status =
      code === "FORBIDDEN"
        ? 403
        : code === "NOT_FOUND"
          ? 404
          : code === "LIFECYCLE_CONFLICT"
            ? 409
            : 500;
    return NextResponse.json(
      {
        code,
        message: error instanceof Error ? error.message : "The update could not be added.",
        requestId: requestContext.requestId,
      },
      { status },
    );
  }
}
