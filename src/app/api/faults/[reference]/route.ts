import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { AuthorizationError } from "../../../../features/auth/role-policy";
import { findActiveMembership } from "../../../../features/auth/staff-service";
import { faultErrorCode, getFault } from "../../../../features/faults/fault-service";
import { createRequestContext } from "../../../../server/request-context";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
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
    const fault = await getFault(reference, membership);
    return NextResponse.json({ fault, requestId: requestContext.requestId });
  } catch (error) {
    const code = faultErrorCode(error);
    const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json(
      {
        code,
        message: error instanceof Error ? error.message : "Fault could not be loaded.",
        requestId: requestContext.requestId,
      },
      { status },
    );
  }
}
