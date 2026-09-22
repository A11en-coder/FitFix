// create a request context for each incoming request, which can be used to track the request throughout the application
import { randomUUID } from "node:crypto";

export type RequestContext = Readonly<{ requestId: string }>;

export function createRequestContext(requestId?: string): RequestContext {
  return { requestId: requestId ?? `req_${randomUUID()}` };
}
