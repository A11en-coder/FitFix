import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthorizationError } from "../../../../../features/auth/role-policy";
import { findActiveMembership } from "../../../../../features/auth/staff-service";
import {
  archiveEquipment,
  equipmentErrorCode,
} from "../../../../../features/equipment/equipment-service";
import { equipmentArchiveSchema } from "../../../../../features/equipment/equipment-schema";
import { createRequestContext } from "../../../../../server/request-context";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
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
    const equipment = await archiveEquipment(
      (await params).publicId,
      equipmentArchiveSchema.parse(await request.json()),
      membership,
      requestContext.requestId,
    );
    return NextResponse.json({
      id: equipment.id,
      publicId: equipment.publicId,
      currentStatus: equipment.currentStatus,
      version: equipment.version,
      archivedAt: equipment.archivedAt,
    });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "A current equipment version is required.",
          fieldErrors: error.flatten().fieldErrors,
          requestId: requestContext.requestId,
        },
        { status: 400 },
      );
    const code = equipmentErrorCode(error);
    const status =
      code === "FORBIDDEN"
        ? 403
        : code === "NOT_FOUND"
          ? 404
          : code === "EQUIPMENT_CONFLICT"
            ? 409
            : 500;
    return NextResponse.json(
      {
        code,
        message: error instanceof Error ? error.message : "The equipment could not be archived.",
        requestId: requestContext.requestId,
      },
      { status },
    );
  }
}
