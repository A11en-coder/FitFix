-- CreateEnum
CREATE TYPE "FaultSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MediaState" AS ENUM ('DRAFT', 'ATTACHED', 'DELETE_PENDING', 'DELETED');

-- AlterTable
ALTER TABLE "AuditEvent" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Equipment" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "EquipmentStatusInterval" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Gym" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GymMember" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StaffInvitation" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserProfile" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WebhookEvent" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "FaultDraft" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "authorMemberId" UUID NOT NULL,
    "equipmentId" UUID,
    "title" VARCHAR(160),
    "description" TEXT,
    "severity" "FaultSeverity",
    "equipmentStatus" "EquipmentStatus",
    "immediateAction" TEXT,
    "discoveredAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FaultDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "uploadedByMemberId" UUID NOT NULL,
    "cloudinaryPublicId" VARCHAR(255) NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "mimeType" VARCHAR(64) NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "state" "MediaState" NOT NULL DEFAULT 'DRAFT',
    "draftId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaultDraft_gymId_authorMemberId_updatedAt_idx" ON "FaultDraft"("gymId", "authorMemberId", "updatedAt");

-- CreateIndex
CREATE INDEX "FaultDraft_updatedAt_idx" ON "FaultDraft"("updatedAt");

-- CreateIndex
CREATE INDEX "FaultDraft_equipmentId_idx" ON "FaultDraft"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_cloudinaryPublicId_key" ON "MediaAsset"("cloudinaryPublicId");

-- CreateIndex
CREATE INDEX "MediaAsset_gymId_state_createdAt_idx" ON "MediaAsset"("gymId", "state", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_draftId_state_idx" ON "MediaAsset"("draftId", "state");

-- AddForeignKey
ALTER TABLE "FaultDraft" ADD CONSTRAINT "FaultDraft_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultDraft" ADD CONSTRAINT "FaultDraft_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "GymMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultDraft" ADD CONSTRAINT "FaultDraft_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedByMemberId_fkey" FOREIGN KEY ("uploadedByMemberId") REFERENCES "GymMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "FaultDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
