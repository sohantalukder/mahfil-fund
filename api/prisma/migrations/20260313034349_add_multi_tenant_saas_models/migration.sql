/*
  Warnings:

  - You are about to drop the column `createdByUserId` on the `Attachment` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CommunityStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('DONATION_RECEIPT', 'SPONSOR_RECEIPT', 'MANUAL');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ErrorLevel" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ErrorSource" AS ENUM ('API', 'MOBILE', 'WEB', 'ADMIN', 'SYNC', 'UPLOAD', 'EMAIL');

-- DropIndex
DROP INDEX "Event_year_key";

-- AlterTable
ALTER TABLE "Attachment" DROP COLUMN "createdByUserId",
ADD COLUMN     "communityId" UUID,
ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalName" TEXT,
ADD COLUMN     "uploadedByUserId" UUID;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "communityId" UUID;

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "communityId" UUID,
ADD COLUMN     "proofAttachmentId" UUID;

-- AlterTable
ALTER TABLE "Donor" ADD COLUMN     "area" TEXT,
ADD COLUMN     "communityId" UUID,
ADD COLUMN     "profileAttachmentId" UUID;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "communityId" UUID;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "communityId" UUID,
ADD COLUMN     "receiptAttachmentId" UUID;

-- AlterTable
ALTER TABLE "Otp" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SyncOperation" ADD COLUMN     "communityId" UUID;

-- CreateTable
CREATE TABLE "Community" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoAttachmentId" UUID,
    "location" TEXT,
    "district" TEXT,
    "thana" TEXT,
    "contactNumber" TEXT,
    "email" TEXT,
    "status" "CommunityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMembership" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "role" "UserRoleName" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "invitedByUserId" UUID,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityInvitation" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "role" "UserRoleName" NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "inviteCodeNormalized" TEXT NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "sentByUserId" UUID,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByUserId" UUID,
    "note" TEXT,
    "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "eventId" UUID,
    "donorId" UUID,
    "donationId" UUID,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceType" "InvoiceType" NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "payerName" TEXT NOT NULL,
    "payerPhone" TEXT,
    "payerAddress" TEXT,
    "amount" INTEGER NOT NULL,
    "amountInWordsBangla" TEXT,
    "paymentMethod" "PaymentMethod",
    "referenceNumber" TEXT,
    "note" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfAttachmentId" UUID,
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" UUID NOT NULL,
    "level" "ErrorLevel" NOT NULL,
    "source" "ErrorSource" NOT NULL,
    "communityId" UUID,
    "userId" UUID,
    "requestId" TEXT,
    "routeName" TEXT,
    "actionName" TEXT,
    "errorCode" TEXT,
    "message" TEXT NOT NULL,
    "stackTrace" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Community_slug_key" ON "Community"("slug");

-- CreateIndex
CREATE INDEX "Community_slug_idx" ON "Community"("slug");

-- CreateIndex
CREATE INDEX "Community_createdByUserId_idx" ON "Community"("createdByUserId");

-- CreateIndex
CREATE INDEX "Community_status_idx" ON "Community"("status");

-- CreateIndex
CREATE INDEX "CommunityMembership_communityId_status_idx" ON "CommunityMembership"("communityId", "status");

-- CreateIndex
CREATE INDEX "CommunityMembership_userId_idx" ON "CommunityMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMembership_userId_communityId_key" ON "CommunityMembership"("userId", "communityId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityInvitation_inviteCode_key" ON "CommunityInvitation"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityInvitation_inviteCodeNormalized_key" ON "CommunityInvitation"("inviteCodeNormalized");

-- CreateIndex
CREATE INDEX "CommunityInvitation_communityId_status_idx" ON "CommunityInvitation"("communityId", "status");

-- CreateIndex
CREATE INDEX "CommunityInvitation_email_idx" ON "CommunityInvitation"("email");

-- CreateIndex
CREATE INDEX "CommunityInvitation_inviteCodeNormalized_idx" ON "CommunityInvitation"("inviteCodeNormalized");

-- CreateIndex
CREATE INDEX "CommunityInvitation_expiresAt_idx" ON "CommunityInvitation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_communityId_idx" ON "Invoice"("communityId");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_donationId_idx" ON "Invoice"("donationId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_issueDate_idx" ON "Invoice"("issueDate");

-- CreateIndex
CREATE INDEX "ErrorLog_level_idx" ON "ErrorLog"("level");

-- CreateIndex
CREATE INDEX "ErrorLog_source_idx" ON "ErrorLog"("source");

-- CreateIndex
CREATE INDEX "ErrorLog_communityId_idx" ON "ErrorLog"("communityId");

-- CreateIndex
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");

-- CreateIndex
CREATE INDEX "ErrorLog_errorCode_idx" ON "ErrorLog"("errorCode");

-- CreateIndex
CREATE INDEX "Attachment_communityId_idx" ON "Attachment"("communityId");

-- CreateIndex
CREATE INDEX "Attachment_entityType_entityId_idx" ON "Attachment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_communityId_idx" ON "AuditLog"("communityId");

-- CreateIndex
CREATE INDEX "Donation_communityId_idx" ON "Donation"("communityId");

-- CreateIndex
CREATE INDEX "Donor_communityId_idx" ON "Donor"("communityId");

-- CreateIndex
CREATE INDEX "Event_communityId_isActive_idx" ON "Event"("communityId", "isActive");

-- CreateIndex
CREATE INDEX "Event_communityId_year_idx" ON "Event"("communityId", "year");

-- CreateIndex
CREATE INDEX "Expense_communityId_idx" ON "Expense"("communityId");

-- CreateIndex
CREATE INDEX "SyncOperation_communityId_idx" ON "SyncOperation"("communityId");

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_logoAttachmentId_fkey" FOREIGN KEY ("logoAttachmentId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMembership" ADD CONSTRAINT "CommunityMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMembership" ADD CONSTRAINT "CommunityMembership_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMembership" ADD CONSTRAINT "CommunityMembership_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityInvitation" ADD CONSTRAINT "CommunityInvitation_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityInvitation" ADD CONSTRAINT "CommunityInvitation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityInvitation" ADD CONSTRAINT "CommunityInvitation_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donor" ADD CONSTRAINT "Donor_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donor" ADD CONSTRAINT "Donor_profileAttachmentId_fkey" FOREIGN KEY ("profileAttachmentId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_proofAttachmentId_fkey" FOREIGN KEY ("proofAttachmentId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_receiptAttachmentId_fkey" FOREIGN KEY ("receiptAttachmentId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_pdfAttachmentId_fkey" FOREIGN KEY ("pdfAttachmentId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncOperation" ADD CONSTRAINT "SyncOperation_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;
