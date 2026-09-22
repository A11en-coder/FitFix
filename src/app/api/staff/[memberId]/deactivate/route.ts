// this file defines the API route for deactivating a staff member in a gym.
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { AuthorizationError } from "../../../../../features/auth/role-policy";
import {
  deactivateStaff,
  findActiveMembership,
  StaffConflictError,
} from "../../../../../features/auth/staff-service";
import { createRequestContext } from "../../../../../server/request-context";

export const dynamic = "force-dynamic";

export async function POST(
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
    const membership = await findActiveMembership(userId);
    if (!membership) throw new AuthorizationError("An active gym membership is required.");
    const updated = await deactivateStaff(
      (await params).memberId,
      membership,
      (await clerkClient()).organizations,
      requestContext.requestId,
    );
    return NextResponse.json({ id: updated.id, role: updated.role, status: updated.status });
  } catch (error) {
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
        code: "DEACTIVATION_FAILED",
        message: "The staff member could not be deactivated.",
        requestId: requestContext.requestId,
      },
      { status: 500 },
    );
  }
}
