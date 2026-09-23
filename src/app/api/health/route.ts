import { NextResponse } from "next/server";
import { db } from "../../../server/db";
import { withRequestId } from "../../../server/http";
import { logError, logInfo } from "../../../server/logger";
import { createRequestContext } from "../../../server/request-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestContext = createRequestContext();
  const startedAt = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    logInfo("health_check_completed", {
      requestId: requestContext.requestId,
      status: 200,
      durationMs: Date.now() - startedAt,
      database: "ok",
    });
    return withRequestId(
      NextResponse.json({
        data: { status: "ok", service: "fitfix", database: "ok" },
        requestId: requestContext.requestId,
      }),
      requestContext.requestId,
    );
  } catch (error) {
    logError("health_check_failed", {
      requestId: requestContext.requestId,
      status: 503,
      durationMs: Date.now() - startedAt,
      error,
    });
    return withRequestId(
      NextResponse.json(
        {
          code: "SERVICE_UNAVAILABLE",
          message: "The service is not ready.",
          requestId: requestContext.requestId,
        },
        { status: 503 },
      ),
      requestContext.requestId,
    );
  }
}
