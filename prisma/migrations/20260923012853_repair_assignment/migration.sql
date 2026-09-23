-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FAULT_ASSIGNED');

-- CreateTable
CREATE TABLE "ExternalTechnician" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "company" VARCHAR(160),
    "email" VARCHAR(254),
    "phone" VARCHAR(40),
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ExternalTechnician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "recipientMemberId" UUID NOT NULL,
    "faultId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" TEXT NOT NULL,
    "destination" VARCHAR(500) NOT NULL,
    "dedupeKey" VARCHAR(160) NOT NULL,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalTechnician_gymId_archivedAt_idx" ON "ExternalTechnician"("gymId", "archivedAt");

-- CreateIndex
CREATE INDEX "ExternalTechnician_gymId_name_idx" ON "ExternalTechnician"("gymId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_gymId_recipientMemberId_readAt_createdAt_idx" ON "Notification"("gymId", "recipientMemberId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_faultId_createdAt_idx" ON "Notification"("faultId", "createdAt");

-- AddForeignKey
ALTER TABLE "ExternalTechnician" ADD CONSTRAINT "ExternalTechnician_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultReport" ADD CONSTRAINT "FaultReport_assigneeMemberId_fkey" FOREIGN KEY ("assigneeMemberId") REFERENCES "GymMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultReport" ADD CONSTRAINT "FaultReport_externalTechnicianId_fkey" FOREIGN KEY ("externalTechnicianId") REFERENCES "ExternalTechnician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientMemberId_fkey" FOREIGN KEY ("recipientMemberId") REFERENCES "GymMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_faultId_fkey" FOREIGN KEY ("faultId") REFERENCES "FaultReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
