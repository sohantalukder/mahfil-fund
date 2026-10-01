-- This migration intentionally contains no ownership guesses. Run
-- `pnpm security:preflight` first; deployment must stop if it reports blockers.

CREATE TYPE "CommunityRole" AS ENUM ('ADMIN', 'COLLECTOR', 'VIEWER');
CREATE TYPE "SyncItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED');
CREATE TYPE "IdempotencyStatus" AS ENUM ('PENDING', 'COMPLETED');
CREATE TYPE "AttachmentStatus" AS ENUM ('PENDING', 'READY', 'DELETING');
CREATE TYPE "OutboxJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "OutboxJobType" AS ENUM ('CREATE_DONATION_INVOICE', 'GENERATE_INVOICE_PDF', 'DELETE_STORAGE_OBJECT');
CREATE TYPE "SecurityEventType" AS ENUM ('TOKEN_FAMILY_CREATED', 'TOKEN_ROTATED', 'TOKEN_REUSE_DETECTED', 'TOKEN_FAMILY_REVOKED', 'ACCOUNT_TOKENS_REVOKED');
ALTER TYPE "SyncOpStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';

ALTER TABLE "User"
  ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User" u
SET "isSuperAdmin" = true
FROM "UserRole" ur
JOIN "Role" r ON r.id = ur."roleId"
WHERE ur."userId" = u.id AND r.name = 'super_admin';

UPDATE "User"
SET "mustChangePassword" = true
WHERE "passwordHash" = '' OR "passwordHash" IS NULL;

UPDATE "User"
SET "passwordHash" = '$disabled$invalid-legacy-hash', "isActive" = false, "mustChangePassword" = true
WHERE "passwordHash" IS NULL OR "passwordHash" = ''
   OR ("passwordHash" NOT LIKE '$2%' AND "passwordHash" NOT LIKE '$argon2id$%');

ALTER TABLE "User" DROP COLUMN "emailVerified";

UPDATE "User" SET email = lower(trim(email));
DROP INDEX IF EXISTS "User_email_key";
CREATE UNIQUE INDEX "User_email_ci_key" ON "User" (lower(email));

ALTER TABLE "CommunityMembership" RENAME COLUMN "invitedByUserId" TO "addedByUserId";

ALTER TABLE "CommunityMembership" ADD COLUMN "roleNew" "CommunityRole";
UPDATE "CommunityMembership"
SET "roleNew" = CASE
  WHEN role::text IN ('super_admin', 'admin') THEN 'ADMIN'::"CommunityRole"
  WHEN role::text = 'collector' THEN 'COLLECTOR'::"CommunityRole"
  ELSE 'VIEWER'::"CommunityRole"
END;
ALTER TABLE "CommunityMembership" ALTER COLUMN "roleNew" SET NOT NULL;
ALTER TABLE "CommunityMembership" DROP COLUMN role;
ALTER TABLE "CommunityMembership" RENAME COLUMN "roleNew" TO role;

ALTER TABLE "AuditLog" ALTER COLUMN "actorRole" TYPE TEXT USING "actorRole"::text;
UPDATE "AuditLog"
SET before = CASE WHEN before IS NULL THEN NULL ELSE jsonb_strip_nulls(jsonb_build_object(
      'status', before->'status', 'role', before->'role', 'isActive', before->'isActive',
      'isSuperAdmin', before->'isSuperAdmin', 'action', before->'action'
    )) END,
    after = CASE WHEN after IS NULL THEN NULL ELSE jsonb_strip_nulls(jsonb_build_object(
      'status', after->'status', 'role', after->'role', 'isActive', after->'isActive',
      'isSuperAdmin', after->'isSuperAdmin', 'action', after->'action'
    )) END;

-- OTPs and idempotency responses are ephemeral and must not survive the auth cutover.
TRUNCATE TABLE "Otp";
ALTER TABLE "Otp" ADD COLUMN "codeHash" TEXT;
ALTER TABLE "Otp" DROP COLUMN code;
ALTER TABLE "Otp" ALTER COLUMN "codeHash" SET NOT NULL;
ALTER TYPE "OtpType" RENAME TO "OtpType_old";
CREATE TYPE "OtpType" AS ENUM ('PASSWORD_RESET');
ALTER TABLE "Otp" ALTER COLUMN type TYPE "OtpType" USING type::text::"OtpType";
DROP TYPE "OtpType_old";
CREATE INDEX "Otp_expiresAt_used_idx" ON "Otp"("expiresAt", used);

CREATE TABLE "RecoveryThrottle" (
  "identifierHash" TEXT NOT NULL,
  kind TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecoveryThrottle_pkey" PRIMARY KEY ("identifierHash", kind)
);
CREATE INDEX "RecoveryThrottle_windowStartedAt_idx" ON "RecoveryThrottle"("windowStartedAt");

ALTER TABLE "RefreshToken"
  ADD COLUMN "familyId" UUID,
  ADD COLUMN "usedAt" TIMESTAMP(3);
UPDATE "RefreshToken" SET "familyId" = gen_random_uuid() WHERE "familyId" IS NULL;
-- Hard cutover: no pre-cutover API refresh session remains valid.
UPDATE "RefreshToken" SET "revokedAt" = CURRENT_TIMESTAMP WHERE "revokedAt" IS NULL;
ALTER TABLE "RefreshToken" ALTER COLUMN "familyId" SET NOT NULL;
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
CREATE INDEX "RefreshToken_expiresAt_revokedAt_idx" ON "RefreshToken"("expiresAt", "revokedAt");

CREATE TABLE "SecurityEvent" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  type "SecurityEventType" NOT NULL,
  "userId" UUID,
  "familyId" UUID,
  client TEXT,
  "deviceHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY (id),
  CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL
);
CREATE INDEX "SecurityEvent_userId_createdAt_idx" ON "SecurityEvent"("userId", "createdAt");
CREATE INDEX "SecurityEvent_familyId_createdAt_idx" ON "SecurityEvent"("familyId", "createdAt");
CREATE INDEX "SecurityEvent_type_createdAt_idx" ON "SecurityEvent"(type, "createdAt");

CREATE TABLE "MigrationAudit" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  migration TEXT NOT NULL,
  counts JSONB NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MigrationAudit_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX "MigrationAudit_migration_key" ON "MigrationAudit"(migration);
INSERT INTO "MigrationAudit" (migration, counts)
SELECT '20260930000000_security_hardening', jsonb_build_object(
  'legacyInvitationsRemoved', (SELECT COUNT(*) FROM "CommunityInvitation"),
  'legacyRolesRemoved', (SELECT COUNT(*) FROM "Role"),
  'legacyUserRolesRemoved', (SELECT COUNT(*) FROM "UserRole"),
  'invalidPasswordsDisabled', (SELECT COUNT(*) FROM "User" WHERE "passwordHash" = '$disabled$invalid-legacy-hash')
);

DROP TABLE IF EXISTS "CommunityInvitation";
DROP TABLE IF EXISTS "UserRole";
DROP TABLE IF EXISTS "Role";
DROP TYPE IF EXISTS "InvitationStatus";
DROP TYPE IF EXISTS "UserRoleName";

ALTER TABLE "Event" ALTER COLUMN "communityId" SET NOT NULL;
ALTER TABLE "Donor" ALTER COLUMN "communityId" SET NOT NULL;
ALTER TABLE "Donation" ALTER COLUMN "communityId" SET NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "communityId" SET NOT NULL;
ALTER TABLE "Attachment" ALTER COLUMN "communityId" SET NOT NULL;
ALTER TABLE "Attachment" ADD COLUMN status "AttachmentStatus" NOT NULL DEFAULT 'READY';
CREATE INDEX "Attachment_status_createdAt_idx" ON "Attachment"(status, "createdAt");
ALTER TABLE "SyncOperation" ALTER COLUMN "communityId" SET NOT NULL;

DROP INDEX IF EXISTS "Event_clientGeneratedId_key";
DROP INDEX IF EXISTS "Donor_clientGeneratedId_key";
DROP INDEX IF EXISTS "Donation_clientGeneratedId_key";
DROP INDEX IF EXISTS "Expense_clientGeneratedId_key";
CREATE UNIQUE INDEX "Event_communityId_clientGeneratedId_key" ON "Event"("communityId", "clientGeneratedId");
CREATE UNIQUE INDEX "Donor_communityId_clientGeneratedId_key" ON "Donor"("communityId", "clientGeneratedId");
CREATE UNIQUE INDEX "Donation_communityId_clientGeneratedId_key" ON "Donation"("communityId", "clientGeneratedId");
CREATE UNIQUE INDEX "Expense_communityId_clientGeneratedId_key" ON "Expense"("communityId", "clientGeneratedId");

ALTER TABLE "Event" ADD CONSTRAINT "Event_id_communityId_key" UNIQUE (id, "communityId");
ALTER TABLE "Donor" ADD CONSTRAINT "Donor_id_communityId_key" UNIQUE (id, "communityId");
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_id_communityId_key" UNIQUE (id, "communityId");
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_id_communityId_key" UNIQUE (id, "communityId");

ALTER TABLE "Community" DROP CONSTRAINT "Community_logoAttachmentId_fkey";
ALTER TABLE "Community" ADD CONSTRAINT "Community_logo_attachment_tenant_fkey"
  FOREIGN KEY ("logoAttachmentId", id) REFERENCES "Attachment"(id, "communityId") ON DELETE RESTRICT;

ALTER TABLE "Donation" ADD CONSTRAINT "Donation_event_tenant_fkey"
  FOREIGN KEY ("eventId", "communityId") REFERENCES "Event"(id, "communityId") ON DELETE RESTRICT;
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_donor_tenant_fkey"
  FOREIGN KEY ("donorId", "communityId") REFERENCES "Donor"(id, "communityId") ON DELETE RESTRICT;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_event_tenant_fkey"
  FOREIGN KEY ("eventId", "communityId") REFERENCES "Event"(id, "communityId") ON DELETE RESTRICT;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_event_tenant_fkey"
  FOREIGN KEY ("eventId", "communityId") REFERENCES "Event"(id, "communityId") ON DELETE RESTRICT;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_donor_tenant_fkey"
  FOREIGN KEY ("donorId", "communityId") REFERENCES "Donor"(id, "communityId") ON DELETE RESTRICT;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_donation_tenant_fkey"
  FOREIGN KEY ("donationId", "communityId") REFERENCES "Donation"(id, "communityId") ON DELETE RESTRICT;
ALTER TABLE "Donor" ADD CONSTRAINT "Donor_attachment_tenant_fkey"
  FOREIGN KEY ("profileAttachmentId", "communityId") REFERENCES "Attachment"(id, "communityId") ON DELETE RESTRICT;
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_attachment_tenant_fkey"
  FOREIGN KEY ("proofAttachmentId", "communityId") REFERENCES "Attachment"(id, "communityId") ON DELETE RESTRICT;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_attachment_tenant_fkey"
  FOREIGN KEY ("receiptAttachmentId", "communityId") REFERENCES "Attachment"(id, "communityId") ON DELETE RESTRICT;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_attachment_tenant_fkey"
  FOREIGN KEY ("pdfAttachmentId", "communityId") REFERENCES "Attachment"(id, "communityId") ON DELETE RESTRICT;

DROP TABLE IF EXISTS "IdempotencyKey";
CREATE TABLE "IdempotencyKey" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "communityId" UUID NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  "requestHash" TEXT,
  "responseBody" JSONB,
  "statusCode" INTEGER,
  status "IdempotencyStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY (id)
);
CREATE INDEX "IdempotencyKey_userId_createdAt_idx" ON "IdempotencyKey"("userId", "createdAt");
CREATE INDEX "IdempotencyKey_status_expiresAt_idx" ON "IdempotencyKey"(status, "expiresAt");
CREATE UNIQUE INDEX "IdempotencyKey_scope_key" ON "IdempotencyKey"("userId", "communityId", method, path, key);
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "Community"(id) ON DELETE CASCADE;

CREATE TABLE "SyncOperationItem" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  "syncOperationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "communityId" UUID NOT NULL,
  "deviceId" TEXT NOT NULL,
  "opId" UUID NOT NULL,
  status "SyncItemStatus" NOT NULL DEFAULT 'PENDING',
  success BOOLEAN,
  "serverId" UUID,
  error TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncOperationItem_pkey" PRIMARY KEY (id),
  CONSTRAINT "SyncOperationItem_syncOperationId_fkey" FOREIGN KEY ("syncOperationId") REFERENCES "SyncOperation"(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX "SyncOperationItem_user_community_device_op_key" ON "SyncOperationItem"("userId", "communityId", "deviceId", "opId");
CREATE INDEX "SyncOperationItem_syncOperationId_idx" ON "SyncOperationItem"("syncOperationId");
CREATE INDEX "SyncOperationItem_status_createdAt_idx" ON "SyncOperationItem"(status, "createdAt");
ALTER TABLE "SyncOperationItem" ADD CONSTRAINT "SyncOperationItem_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "SyncOperationItem" ADD CONSTRAINT "SyncOperationItem_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "Community"(id) ON DELETE CASCADE;

CREATE TABLE "InvoiceSequence" (
  "communityId" UUID NOT NULL,
  year INTEGER NOT NULL,
  current INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("communityId", year),
  CONSTRAINT "InvoiceSequence_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"(id) ON DELETE CASCADE
);

INSERT INTO "InvoiceSequence" ("communityId", year, current)
SELECT
  "communityId",
  EXTRACT(YEAR FROM "issueDate")::INTEGER,
  MAX((regexp_match("invoiceNumber", '-([0-9]+)$'))[1]::INTEGER)
FROM "Invoice"
GROUP BY "communityId", EXTRACT(YEAR FROM "issueDate");

DROP INDEX IF EXISTS "Invoice_invoiceNumber_key";
CREATE UNIQUE INDEX "Invoice_communityId_invoiceNumber_key" ON "Invoice"("communityId", "invoiceNumber");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_id_communityId_key" UNIQUE (id, "communityId");
CREATE UNIQUE INDEX "Event_one_active_per_community_key"
  ON "Event"("communityId") WHERE "isActive" = true AND status = 'ACTIVE';
CREATE UNIQUE INDEX "Invoice_one_active_per_donation_key"
  ON "Invoice"("communityId", "donationId")
  WHERE "donationId" IS NOT NULL AND status <> 'CANCELLED';

CREATE TABLE "OutboxJob" (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  type "OutboxJobType" NOT NULL,
  status "OutboxJobStatus" NOT NULL DEFAULT 'PENDING',
  "communityId" UUID NOT NULL,
  "entityId" UUID NOT NULL,
  "objectBucket" TEXT,
  "objectPath" TEXT,
  "createdByUserId" UUID,
  attempts INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseUntil" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboxJob_pkey" PRIMARY KEY (id),
  CONSTRAINT "OutboxJob_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"(id) ON DELETE CASCADE,
  CONSTRAINT "OutboxJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"(id) ON DELETE SET NULL
);
CREATE INDEX "OutboxJob_status_availableAt_idx" ON "OutboxJob"(status, "availableAt");
CREATE INDEX "OutboxJob_leaseUntil_idx" ON "OutboxJob"("leaseUntil");
CREATE INDEX "OutboxJob_communityId_entityId_idx" ON "OutboxJob"("communityId", "entityId");
