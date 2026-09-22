CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TYPE "MemberRole" AS ENUM ('MANAGER', 'STAFF');
CREATE TYPE "MemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'DEACTIVATED');

CREATE TABLE "Gym" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "clerkOrganizationId" VARCHAR(120) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "slug" VARCHAR(80) NOT NULL,
  "timeZone" VARCHAR(64) NOT NULL,
  "currencyCode" CHAR(3) NOT NULL DEFAULT 'AUD',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Gym_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserProfile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "clerkUserId" VARCHAR(120) NOT NULL,
  "displayName" VARCHAR(120) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "GymMember" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "gymId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" "MemberRole" NOT NULL DEFAULT 'STAFF',
  "status" "MemberStatus" NOT NULL DEFAULT 'INVITED',
  "joinedAt" TIMESTAMPTZ(3),
  "deactivatedAt" TIMESTAMPTZ(3),
  CONSTRAINT "GymMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Gym_clerkOrganizationId_key" ON "Gym"("clerkOrganizationId");
CREATE UNIQUE INDEX "Gym_slug_key" ON "Gym"("slug");
CREATE UNIQUE INDEX "UserProfile_clerkUserId_key" ON "UserProfile"("clerkUserId");
CREATE UNIQUE INDEX "GymMember_gymId_userId_key" ON "GymMember"("gymId", "userId");
CREATE UNIQUE INDEX "GymMember_one_active_membership_per_user" ON "GymMember"("userId") WHERE "status" IN ('INVITED', 'ACTIVE');
CREATE INDEX "GymMember_gymId_idx" ON "GymMember"("gymId");
CREATE INDEX "GymMember_userId_status_idx" ON "GymMember"("userId", "status");
ALTER TABLE "GymMember" ADD CONSTRAINT "GymMember_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymMember" ADD CONSTRAINT "GymMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
