import { NextResponse } from "next/server";
import { requestIdHeaders } from "./http";

export function unauthorizedJobResponse(requestId: string) {
  return NextResponse.json(
    {
      code: "UNAUTHORIZED_JOB",
      message: "Job authorization required.",
      requestId,
    },
    { status: 401, headers: requestIdHeaders(requestId) },
  );
}
