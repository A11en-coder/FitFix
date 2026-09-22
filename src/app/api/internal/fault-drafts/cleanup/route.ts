// this file handles the cleanup of expired fault drafts and their associated media assets
import { NextResponse } from "next/server";
import { deleteCloudinaryAsset } from "../../../../../features/faults/cloudinary-service";
import { expireFaultDrafts } from "../../../../../features/faults/draft-service";
import { db } from "../../../../../server/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expectedSecret = process.env.INTERNAL_JOB_SECRET;
  const providedSecret = request.headers.get("x-internal-job-secret");
  if (!expectedSecret || providedSecret !== expectedSecret)
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Internal job authorization required." },
      { status: 401 },
    );

  const result = await expireFaultDrafts();
  let deletedMedia = 0;
  for (const media of result.pendingMedia) {
    try {
      if (await deleteCloudinaryAsset(media.cloudinaryPublicId)) {
        await db.mediaAsset.update({ where: { id: media.id }, data: { state: "DELETED" } });
        deletedMedia += 1;
      }
    } catch {
      // Keep DELETE_PENDING so the next scheduled reconciliation can retry it.
    }
  }
  return NextResponse.json({
    expiredDrafts: result.expiredDrafts,
    deletedMedia,
    pendingMedia: result.pendingMedia.length,
  });
}
