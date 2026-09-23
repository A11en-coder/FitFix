import { timingSafeEqual } from "node:crypto";

export function isAuthorizedInternalJob(request: Request) {
  const expected = process.env.INTERNAL_JOB_SECRET;
  const provided = request.headers.get("x-internal-job-secret");
  if (!expected || !provided) return false;

  const expectedBytes = Buffer.from(expected, "utf8");
  const providedBytes = Buffer.from(provided, "utf8");
  return (
    expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes)
  );
}
