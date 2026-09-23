import { NextResponse } from "next/server";

export function withRequestId(response: NextResponse, requestId: string) {
  response.headers.set("X-Request-Id", requestId);
  return response;
}

export function requestIdHeaders(requestId: string) {
  return { "X-Request-Id": requestId };
}
