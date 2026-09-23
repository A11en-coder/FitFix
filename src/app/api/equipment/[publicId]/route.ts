import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthorizationError } from "../../../../features/auth/role-policy";
import { findActiveMembership } from "../../../../features/auth/staff-service";
import {
  equipmentErrorCode,
  getEquipment,
  updateEquipment,
} from "../../../../features/equipment/equipment-service";
import { equipmentUpdateSchema } from "../../../../features/equipment/equipment-schema";
import { createRequestContext } from "../../../../server/request-context";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
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
    const result = await getEquipment((await params).publicId, membership);
    return NextResponse.json({
      canManage: result.canManage,
      equipment: result.equipment,
    });
  } catch (error) {
    return equipmentResponseError(error, requestContext.requestId);
  }
}

export async function PATCH(
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
    const equipment = await updateEquipment(
      (await params).publicId,
      equipmentUpdateSchema.parse(await request.json()),
      membership,
      requestContext.requestId,
    );
    const { gymId: _gymId, ...safeEquipment } = equipment;
    return NextResponse.json({ equipment: safeEquipment, canManage: true });
  } catch (error) {
    return equipmentResponseError(error, requestContext.requestId);
  }
}

function equipmentResponseError(error: unknown, requestId: string) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "Please check the equipment details.",
        fieldErrors: error.flatten().fieldErrors,
        requestId,
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
      message: error instanceof Error ? error.message : "The equipment operation failed.",
      requestId,
    },
    { status },
  );
}
