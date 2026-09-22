// this file defines the API routes for the equipment feature
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { findActiveMembership } from "../../../features/auth/staff-service";
import {
  createEquipment,
  equipmentErrorCode,
  listEquipment,
} from "../../../features/equipment/equipment-service";
import {
  equipmentCreateSchema,
  equipmentSearchSchema,
} from "../../../features/equipment/equipment-schema";
import { AuthorizationError } from "../../../features/auth/role-policy";
import { createRequestContext } from "../../../server/request-context";

export const dynamic = "force-dynamic";

// this function handles GET request to list the equipment for the user's gym, applying any search filters, and returning a summary of each equipment item in the response
export async function GET(request: Request) {
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
    const filters = equipmentSearchSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const result = await listEquipment(membership, filters);
    return NextResponse.json({ ...result, items: result.items.map(toEquipmentSummary) });
  } catch (error) {
    return equipmentResponseError(error, requestContext.requestId);
  }
}

// this function converts the equipment object to a summary object that can be returned in the API response
export async function POST(request: Request) {
  // create a request context to track the request ID and other metadata
  const requestContext = createRequestContext();
  // authenticate the user using Clerk
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
    // check if the user has an active gym membership
    const membership = await findActiveMembership(userId);
    if (!membership) throw new AuthorizationError("An active gym membership is required.");

    // create the equipment and store it in the database, returning a summary of the equipment in the response
    const equipment = await createEquipment(
      equipmentCreateSchema.parse(await request.json()),
      membership,
      requestContext.requestId,
    );
    return NextResponse.json(toEquipmentSummary(equipment), { status: 201 });
  } catch (error) {
    return equipmentResponseError(error, requestContext.requestId);
  }
}

function toEquipmentSummary(equipment: {
  id: string;
  publicId: string;
  assetId: string;
  name: string;
  category: string;
  location: string;
  description: string | null;
  currentStatus: string;
  version: number;
  archivedAt: Date | null;
}) {
  return {
    id: equipment.id,
    publicId: equipment.publicId,
    assetId: equipment.assetId,
    name: equipment.name,
    category: equipment.category,
    location: equipment.location,
    description: equipment.description,
    currentStatus: equipment.currentStatus,
    version: equipment.version,
    archivedAt: equipment.archivedAt,
  };
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
