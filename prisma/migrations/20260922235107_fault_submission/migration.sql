-- CreateEnum
CREATE TYPE "FaultStatus" AS ENUM ('REPORTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FaultUpdateType" AS ENUM ('COMMENT', 'STATUS', 'ASSIGNMENT', 'RESOLUTION', 'REOPEN');

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "faultId" UUID;

-- CreateTable
CREATE TABLE "FaultReport" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "publicReference" VARCHAR(24) NOT NULL,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "idempotencyFingerprint" CHAR(64) NOT NULL,
    "equipmentId" UUID NOT NULL,
    "reporterMemberId" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "FaultSeverity" NOT NULL,
    "status" "FaultStatus" NOT NULL DEFAULT 'REPORTED',
    "reportedEquipmentStatus" "EquipmentStatus" NOT NULL,
    "immediateAction" TEXT,
    "discoveredAt" TIMESTAMPTZ(3) NOT NULL,
    "assigneeMemberId" UUID,
    "externalTechnicianId" UUID,
    "targetDate" DATE,
    "resolutionSummary" TEXT,
    "repairCost" DECIMAL(12,2),
    "resolvedAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FaultReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaultUpdate" (
    "id" UUID NOT NULL,
    "faultId" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "authorMemberId" UUID,
    "type" "FaultUpdateType" NOT NULL DEFAULT 'COMMENT',
    "body" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaultUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FaultReport_publicReference_key" ON "FaultReport"("publicReference");

-- CreateIndex
CREATE INDEX "FaultReport_gymId_status_severity_idx" ON "FaultReport"("gymId", "status", "severity");

-- CreateIndex
CREATE INDEX "FaultReport_gymId_equipmentId_createdAt_idx" ON "FaultReport"("gymId", "equipmentId", "createdAt");

-- CreateIndex
CREATE INDEX "FaultReport_gymId_reporterMemberId_idx" ON "FaultReport"("gymId", "reporterMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "FaultReport_gymId_idempotencyKey_key" ON "FaultReport"("gymId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "FaultUpdate_faultId_createdAt_idx" ON "FaultUpdate"("faultId", "createdAt");

-- CreateIndex
CREATE INDEX "FaultUpdate_gymId_createdAt_idx" ON "FaultUpdate"("gymId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_faultId_state_idx" ON "MediaAsset"("faultId", "state");

-- AddForeignKey
ALTER TABLE "FaultReport" ADD CONSTRAINT "FaultReport_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultReport" ADD CONSTRAINT "FaultReport_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultReport" ADD CONSTRAINT "FaultReport_reporterMemberId_fkey" FOREIGN KEY ("reporterMemberId") REFERENCES "GymMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultUpdate" ADD CONSTRAINT "FaultUpdate_faultId_fkey" FOREIGN KEY ("faultId") REFERENCES "FaultReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultUpdate" ADD CONSTRAINT "FaultUpdate_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultUpdate" ADD CONSTRAINT "FaultUpdate_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "GymMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_faultId_fkey" FOREIGN KEY ("faultId") REFERENCES "FaultReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
