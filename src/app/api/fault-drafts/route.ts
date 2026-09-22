import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthorizationError } from "../../../features/auth/role-policy";
import { findActiveMembership } from "../../../features/auth/staff-service";
import { createFaultDraft, draftErrorCode } from "../../../features/faults/draft-service";
import { faultDraftCreateSchema } from "../../../features/faults/draft-schema";
import { createRequestContext } from "../../../server/request-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
    // create a new fault draft with the validated input and return it as a JSON response
    const draft = await createFaultDraft(
      // parse the request
      faultDraftCreateSchema.parse(await request.json()),
      membership,
      requestContext.requestId,
    );
    return NextResponse.json(toDraftResponse(draft), { status: 201 });
  } catch (error) {
    return draftResponseError(error, requestContext.requestId);
  }
}

function toDraftResponse(draft: {
  id: string;
  title: string | null;
  description: string | null;
  severity: string | null;
  equipmentStatus: string | null;
  immediateAction: string | null;
  discoveredAt: Date | null;
  version: number;
  updatedAt: Date;
  mediaAssets: Array<{
    id: string;
    secureUrl: string;
    mimeType: string;
    bytes: number;
    width: number;
    height: number;
    state: string;
  }>;
}) {
  return {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    severity: draft.severity,
    equipmentStatus: draft.equipmentStatus,
    immediateAction: draft.immediateAction,
    discoveredAt: draft.discoveredAt,
    version: draft.version,
    updatedAt: draft.updatedAt,
    mediaAssets: draft.mediaAssets,
  };
}

function draftResponseError(error: unknown, requestId: string) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "Please check the draft details.",
        fieldErrors: error.flatten().fieldErrors,
        requestId,
      },
      { status: 400 },
    );
  const code = draftErrorCode(error);
  const status =
    code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "DRAFT_CONFLICT" ? 409 : 500;
  return NextResponse.json(
    {
      code,
      message: error instanceof Error ? error.message : "The draft operation failed.",
      requestId,
    },
    { status },
  );
}
