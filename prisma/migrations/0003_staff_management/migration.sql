-- CreateEnum
CREATE TYPE "StaffInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "StaffInvitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gymId" UUID NOT NULL,
    "invitedByMemberId" UUID NOT NULL,
    "clerkInvitationId" VARCHAR(120) NOT NULL,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'STAFF',
    "status" "StaffInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "StaffInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffInvitation_clerkInvitationId_key" ON "StaffInvitation"("clerkInvitationId");
CREATE UNIQUE INDEX "StaffInvitation_gymId_idempotencyKey_key" ON "StaffInvitation"("gymId", "idempotencyKey");
CREATE INDEX "StaffInvitation_gymId_status_idx" ON "StaffInvitation"("gymId", "status");
CREATE INDEX "StaffInvitation_gymId_email_status_idx" ON "StaffInvitation"("gymId", "email", "status");

ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_invitedByMemberId_fkey" FOREIGN KEY ("invitedByMemberId") REFERENCES "GymMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gymId" UUID NOT NULL,
    "actorMemberId" UUID,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "requestId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditEvent_gymId_createdAt_idx" ON "AuditEvent"("gymId", "createdAt");
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorMemberId_fkey" FOREIGN KEY ("actorMemberId") REFERENCES "GymMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
