import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthorizationError } from "../../../features/auth/role-policy";
import { findActiveMembership } from "../../../features/auth/staff-service";
import { dashboardQuerySchema } from "../../../features/dashboard/dashboard-schema";
import { DashboardRangeError, getDashboard } from "../../../features/dashboard/dashboard-service";
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
    const input = dashboardQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const dashboard = await getDashboard(membership, input);
    return NextResponse.json({ ...dashboard, requestId: requestContext.requestId });
  } catch (error) {
    if (error instanceof ZodError || error instanceof DashboardRangeError)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Invalid dashboard range.",
          fieldErrors: error instanceof ZodError ? error.flatten().fieldErrors : undefined,
          requestId: requestContext.requestId,
        },
        { status: 400 },
      );
    const status = error instanceof AuthorizationError ? 403 : 500;
    return NextResponse.json(
      {
        code: status === 403 ? "FORBIDDEN" : "DASHBOARD_FAILED",
        message: error instanceof Error ? error.message : "Dashboard could not be loaded.",
        requestId: requestContext.requestId,
      },
      { status },
    );
  }
}
