// create a request context for each incoming request, which can be used to track the request throughout the application
import { randomUUID } from "node:crypto";

export type RequestContext = Readonly<{ requestId: string }>;

export function createRequestContext(requestId?: string): RequestContext {
  const candidate = requestId?.trim();
  const safeRequestId = candidate && /^[A-Za-z0-9_-]{1,100}$/.test(candidate) ? candidate : null;
  return { requestId: safeRequestId ?? `req_${randomUUID()}` };
}
