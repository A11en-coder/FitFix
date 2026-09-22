-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('AVAILABLE', 'LIMITED', 'OUT_OF_SERVICE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Equipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gymId" UUID NOT NULL,
    "publicId" VARCHAR(26) NOT NULL,
    "assetId" VARCHAR(50) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "location" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "currentStatus" "EquipmentStatus" NOT NULL DEFAULT 'AVAILABLE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Equipment_publicId_key" ON "Equipment"("publicId");
CREATE UNIQUE INDEX "Equipment_gymId_assetId_key" ON "Equipment"("gymId", "assetId");
CREATE INDEX "Equipment_gymId_currentStatus_idx" ON "Equipment"("gymId", "currentStatus");
CREATE INDEX "Equipment_gymId_name_idx" ON "Equipment"("gymId", "name");
CREATE INDEX "Equipment_gymId_category_location_idx" ON "Equipment"("gymId", "category", "location");

ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "EquipmentStatusInterval" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipmentId" UUID NOT NULL,
    "status" "EquipmentStatus" NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ(3),
    "sourceFaultId" UUID,
    "changedByMemberId" UUID NOT NULL,

    CONSTRAINT "EquipmentStatusInterval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EquipmentStatusInterval_equipmentId_startedAt_idx" ON "EquipmentStatusInterval"("equipmentId", "startedAt");
CREATE INDEX "EquipmentStatusInterval_equipmentId_endedAt_idx" ON "EquipmentStatusInterval"("equipmentId", "endedAt");

ALTER TABLE "EquipmentStatusInterval" ADD CONSTRAINT "EquipmentStatusInterval_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EquipmentStatusInterval" ADD CONSTRAINT "EquipmentStatusInterval_changedByMemberId_fkey" FOREIGN KEY ("changedByMemberId") REFERENCES "GymMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
