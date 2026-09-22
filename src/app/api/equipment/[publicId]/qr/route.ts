import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { AuthorizationError } from "../../../../../features/auth/role-policy";
import { findActiveMembership } from "../../../../../features/auth/staff-service";
import {
  equipmentErrorCode,
  getEquipmentQrTarget,
} from "../../../../../features/equipment/equipment-service";
import {
  createEquipmentQrPng,
  equipmentPageUrl,
} from "../../../../../features/equipment/qr-service";
import { getConfig } from "../../../../../server/config";
import { createRequestContext } from "../../../../../server/request-context";

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
    const equipment = await getEquipmentQrTarget((await params).publicId, membership);
    const { APP_URL } = getConfig();
    // create QR code PNG for the equipment page URL
    const png = await createEquipmentQrPng(equipmentPageUrl(APP_URL, equipment.publicId));
    const safeAssetId = equipment.assetId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="fitfix-${safeAssetId}-qr.png"`,
        "Cache-Control": "private, no-store",
        "X-Request-Id": requestContext.requestId,
      },
    });
  } catch (error) {
    const code = equipmentErrorCode(error);
    const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json(
      {
        code,
        message: error instanceof Error ? error.message : "The QR code could not be generated.",
        requestId: requestContext.requestId,
      },
      { status },
    );
  }
}
