import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthorizationError } from "../../../../../features/auth/role-policy";
import {
  changeStaffRole,
  findActiveMembership,
  StaffConflictError,
} from "../../../../../features/auth/staff-service";
import { staffRoleSchema } from "../../../../../features/auth/staff-schema";
import { createRequestContext } from "../../../../../server/request-context";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
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
    const input = staffRoleSchema.parse(await request.json());
    const membership = await findActiveMembership(userId);
    if (!membership) throw new AuthorizationError("An active gym membership is required.");
    const updated = await changeStaffRole(
      (await params).memberId,
      input,
      membership,
      (await clerkClient()).organizations,
      requestContext.requestId,
    );
    return NextResponse.json({ id: updated.id, role: updated.role, status: updated.status });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Please select a valid role.",
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
        code: "ROLE_CHANGE_FAILED",
        message: "The role could not be changed.",
        requestId: requestContext.requestId,
      },
      { status: 500 },
    );
  }
}
