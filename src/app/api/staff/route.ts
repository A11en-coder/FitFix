// this file defines the API route for listing staff members and invitations for a gym.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { AuthorizationError, assertManager } from "../../../features/auth/role-policy";
import { findActiveMembership, listStaff } from "../../../features/auth/staff-service";
import { createRequestContext } from "../../../server/request-context";

export const dynamic = "force-dynamic";

export async function GET() {
  // Create a request context for logging and tracing
  const requestContext = createRequestContext();

  // Authenticate the user using Clerk
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
    // Check if the user has an active gym membership before allowing them to list staff members
    const membership = await findActiveMembership(userId);
    if (!membership) throw new AuthorizationError("An active gym membership is required.");

    // Ensure that the user has manager privileges before proceeding to list staff members
    assertManager(membership);

    // Retrieve the list of staff members and invitations for the gym and return it in the response
    const result = await listStaff(membership);
    return NextResponse.json({
      members: result.members.map((member) => ({
        id: member.id,
        role: member.role,
        status: member.status,
        user: { displayName: member.user.displayName, email: member.user.email },
      })),
      invitations: result.invitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      })),
    });
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 500;
    return NextResponse.json(
      {
        code: status === 403 ? "FORBIDDEN" : "STAFF_LIST_FAILED",
        message: error instanceof Error ? error.message : "Staff could not be loaded.",
        requestId: requestContext.requestId,
      },
      { status },
    );
  }
}
