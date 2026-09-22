import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthorizationError } from "../../../../../features/auth/role-policy";
import { findActiveMembership } from "../../../../../features/auth/staff-service";
import { draftErrorCode, registerDraftMedia } from "../../../../../features/faults/draft-service";
import { mediaRegistrationSchema } from "../../../../../features/faults/draft-schema";
import { createRequestContext } from "../../../../../server/request-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    // register a new media asset for the fault draft with the validated input and return it as a JSON response
    const media = await registerDraftMedia(
      (await params).id,
      mediaRegistrationSchema.parse(await request.json()),
      membership,
    );
    return NextResponse.json(
      {
        media: {
          id: media.id,
          secureUrl: media.secureUrl,
          mimeType: media.mimeType,
          bytes: media.bytes,
          width: media.width,
          height: media.height,
          state: media.state,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Please check the media details.",
          fieldErrors: error.flatten().fieldErrors,
          requestId: requestContext.requestId,
        },
        { status: 400 },
      );
    const code = draftErrorCode(error);
    const status =
      code === "FORBIDDEN"
        ? 403
        : code === "NOT_FOUND"
          ? 404
          : code === "DRAFT_CONFLICT"
            ? 409
            : 500;
    return NextResponse.json(
      {
        code,
        message: error instanceof Error ? error.message : "The media could not be registered.",
        requestId: requestContext.requestId,
      },
      { status },
    );
  }
}
