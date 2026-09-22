// this file contains the CRUD operations for fault drafts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthorizationError } from "../../../../features/auth/role-policy";
import { findActiveMembership } from "../../../../features/auth/staff-service";
import {
  deleteFaultDraft,
  draftErrorCode,
  getFaultDraft,
  updateFaultDraft,
} from "../../../../features/faults/draft-service";
import { faultDraftUpdateSchema } from "../../../../features/faults/draft-schema";
import { createRequestContext } from "../../../../server/request-context";

export const dynamic = "force-dynamic";

// this is the GET handler for retrieving a fault draft by its ID
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // create a request context for logging and tracing
  const requestContext = createRequestContext();
  // authenticate the user using Clerk
  const { userId } = await auth();
  if (!userId) return unauthenticated(requestContext.requestId);
  try {
    const membership = await findActiveMembership(userId);
    if (!membership) throw new AuthorizationError("An active gym membership is required.");
    // retrieve the fault draft by its ID and return it as a JSON response
    return NextResponse.json(toDraftResponse(await getFaultDraft((await params).id, membership)));
  } catch (error) {
    return draftResponseError(error, requestContext.requestId);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestContext = createRequestContext();
  const { userId } = await auth();
  if (!userId) return unauthenticated(requestContext.requestId);
  try {
    const membership = await findActiveMembership(userId);
    if (!membership) throw new AuthorizationError("An active gym membership is required.");
    const draft = await updateFaultDraft(
      (await params).id,
      faultDraftUpdateSchema.parse(await request.json()),
      membership,
      requestContext.requestId,
    );
    // return the updated draft as a JSON response
    return NextResponse.json(toDraftResponse(draft));
  } catch (error) {
    return draftResponseError(error, requestContext.requestId);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestContext = createRequestContext();
  const { userId } = await auth();
  if (!userId) return unauthenticated(requestContext.requestId);
  try {
    const membership = await findActiveMembership(userId);
    if (!membership) throw new AuthorizationError("An active gym membership is required.");
    // delete the fault draft by its ID and return a 204 No Content response
    await deleteFaultDraft((await params).id, membership, requestContext.requestId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return draftResponseError(error, requestContext.requestId);
  }
}

function unauthenticated(requestId: string) {
  return NextResponse.json(
    { code: "UNAUTHENTICATED", message: "Authentication required.", requestId },
    { status: 401 },
  );
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
  equipment?: {
    publicId: string;
    assetId: string;
    name: string;
    location: string;
    currentStatus: string;
  } | null;
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
    equipmentPublicId: draft.equipment?.publicId ?? null,
    equipment: draft.equipment ?? null,
    mediaAssets: draft.mediaAssets.map(
      ({ id, secureUrl, mimeType, bytes, width, height, state }) => ({
        id,
        secureUrl,
        mimeType,
        bytes,
        width,
        height,
        state,
      }),
    ),
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
