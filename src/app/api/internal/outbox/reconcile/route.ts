import { NextResponse } from "next/server";
import {
  reconcileEmailOutbox,
  outboxErrorCode,
} from "../../../../../features/notifications/outbox-service";
import { createRequestContext } from "../../../../../server/request-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestContext = createRequestContext();
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!secret || request.headers.get("x-internal-job-secret") !== secret)
    return NextResponse.json(
      {
        code: "UNAUTHORIZED_JOB",
        message: "Job authorization required.",
        requestId: requestContext.requestId,
      },
      { status: 401 },
    );
  try {
    const result = await reconcileEmailOutbox();
    return NextResponse.json({ ...result, requestId: requestContext.requestId });
  } catch (error) {
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
