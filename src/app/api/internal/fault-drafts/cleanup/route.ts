// this file handles the cleanup of expired fault drafts and their associated media assets
import { NextResponse } from "next/server";
import { deleteCloudinaryAsset } from "../../../../../features/faults/cloudinary-service";
import { expireFaultDrafts } from "../../../../../features/faults/draft-service";
import { db } from "../../../../../server/db";
import { withRequestId } from "../../../../../server/http";
import { isAuthorizedInternalJob } from "../../../../../server/internal-job";
import { unauthorizedJobResponse } from "../../../../../server/internal-job-response";
import { logError, logInfo, logWarn } from "../../../../../server/logger";
import { createRequestContext } from "../../../../../server/request-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestContext = createRequestContext();
  if (!isAuthorizedInternalJob(request)) {
    logWarn("internal_job_denied", {
      requestId: requestContext.requestId,
      route: "/api/internal/fault-drafts/cleanup",
    });
    return unauthorizedJobResponse(requestContext.requestId);
  }

  try {
    const result = await expireFaultDrafts();
    let deletedMedia = 0;
    for (const media of result.pendingMedia) {
      try {
        if (await deleteCloudinaryAsset(media.cloudinaryPublicId)) {
          await db.mediaAsset.update({ where: { id: media.id }, data: { state: "DELETED" } });
          deletedMedia += 1;
        }
      } catch (error) {
        logWarn("fault_draft_media_cleanup_deferred", {
          requestId: requestContext.requestId,
          mediaId: media.id,
          error,
        });
        // Keep DELETE_PENDING so the next scheduled reconciliation can retry it.
      }
    }
    const response = {
      expiredDrafts: result.expiredDrafts,
      deletedMedia,
      pendingMedia: result.pendingMedia.length,
      requestId: requestContext.requestId,
    };
    logInfo("fault_draft_cleanup_completed", { ...response });
    return withRequestId(NextResponse.json(response), requestContext.requestId);
  } catch (error) {
    logError("fault_draft_cleanup_failed", { requestId: requestContext.requestId, error });
    return withRequestId(
      NextResponse.json(
        {
          code: "DRAFT_CLEANUP_FAILED",
          message: "Fault draft cleanup failed.",
          requestId: requestContext.requestId,
        },
        { status: 500 },
      ),
      requestContext.requestId,
    );
  }
}
