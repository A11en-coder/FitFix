import { NextResponse } from "next/server";
import {
  reconcileEmailOutbox,
  outboxErrorCode,
} from "../../../../../features/notifications/outbox-service";
import { createRequestContext } from "../../../../../server/request-context";
import { withRequestId } from "../../../../../server/http";
import { isAuthorizedInternalJob } from "../../../../../server/internal-job";
import { unauthorizedJobResponse } from "../../../../../server/internal-job-response";
import { logError, logInfo, logWarn } from "../../../../../server/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestContext = createRequestContext();
  if (!isAuthorizedInternalJob(request)) {
    logWarn("internal_job_denied", {
      requestId: requestContext.requestId,
      route: "/api/internal/outbox/reconcile",
    });
    return unauthorizedJobResponse(requestContext.requestId);
  }
  try {
    const result = await reconcileEmailOutbox();
    logInfo("outbox_reconciliation_completed", {
      requestId: requestContext.requestId,
      route: "/api/internal/outbox/reconcile",
      ...result,
    });
    return withRequestId(
      NextResponse.json({ ...result, requestId: requestContext.requestId }),
      requestContext.requestId,
    );
  } catch (error) {
    logError("outbox_reconciliation_failed", {
      requestId: requestContext.requestId,
      route: "/api/internal/outbox/reconcile",
      error,
    });
    return NextResponse.json(
      {
        code: outboxErrorCode(error),
        message: "Email outbox reconciliation failed.",
        requestId: requestContext.requestId,
      },
      { status: 500 },
    );
  }
}
