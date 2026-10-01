import { writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
type CountRow = { count: bigint };

async function count(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(sql);
  return Number(rows[0]?.count ?? 0n);
}

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT to_regclass(${`public.${name}`}) IS NOT NULL AS exists
  `;
  return rows[0]?.exists ?? false;
}

async function optionalCount(table: string, sql: string): Promise<number> {
  return (await tableExists(table)) ? count(sql) : 0;
}

async function main() {
  const blockers = {
    nullEventCommunity: await count('SELECT COUNT(*) AS count FROM "Event" WHERE "communityId" IS NULL'),
    nullDonorCommunity: await count('SELECT COUNT(*) AS count FROM "Donor" WHERE "communityId" IS NULL'),
    nullDonationCommunity: await count('SELECT COUNT(*) AS count FROM "Donation" WHERE "communityId" IS NULL'),
    nullExpenseCommunity: await count('SELECT COUNT(*) AS count FROM "Expense" WHERE "communityId" IS NULL'),
    nullAttachmentCommunity: await count('SELECT COUNT(*) AS count FROM "Attachment" WHERE "communityId" IS NULL'),
    nullSyncCommunity: await count('SELECT COUNT(*) AS count FROM "SyncOperation" WHERE "communityId" IS NULL'),
    crossTenantDonationEvent: await count('SELECT COUNT(*) AS count FROM "Donation" d JOIN "Event" e ON e.id=d."eventId" WHERE d."communityId" IS DISTINCT FROM e."communityId"'),
    crossTenantDonationDonor: await count('SELECT COUNT(*) AS count FROM "Donation" d JOIN "Donor" x ON x.id=d."donorId" WHERE d."communityId" IS DISTINCT FROM x."communityId"'),
    crossTenantExpenseEvent: await count('SELECT COUNT(*) AS count FROM "Expense" x JOIN "Event" e ON e.id=x."eventId" WHERE x."communityId" IS DISTINCT FROM e."communityId"'),
    crossTenantInvoiceEvent: await count('SELECT COUNT(*) AS count FROM "Invoice" i JOIN "Event" e ON e.id=i."eventId" WHERE i."communityId" IS DISTINCT FROM e."communityId"'),
    crossTenantInvoiceDonor: await count('SELECT COUNT(*) AS count FROM "Invoice" i JOIN "Donor" d ON d.id=i."donorId" WHERE i."communityId" IS DISTINCT FROM d."communityId"'),
    crossTenantInvoiceDonation: await count('SELECT COUNT(*) AS count FROM "Invoice" i JOIN "Donation" d ON d.id=i."donationId" WHERE i."communityId" IS DISTINCT FROM d."communityId"'),
    duplicateCaseInsensitiveEmails: await count('SELECT COUNT(*) AS count FROM (SELECT lower(trim(email)) FROM "User" GROUP BY lower(trim(email)) HAVING COUNT(*) > 1) q'),
    duplicateEventClientIds: await count('SELECT COUNT(*) AS count FROM (SELECT 1 FROM "Event" WHERE "clientGeneratedId" IS NOT NULL GROUP BY "communityId", "clientGeneratedId" HAVING COUNT(*) > 1) q'),
    duplicateDonorClientIds: await count('SELECT COUNT(*) AS count FROM (SELECT 1 FROM "Donor" WHERE "clientGeneratedId" IS NOT NULL GROUP BY "communityId", "clientGeneratedId" HAVING COUNT(*) > 1) q'),
    duplicateDonationClientIds: await count('SELECT COUNT(*) AS count FROM (SELECT 1 FROM "Donation" WHERE "clientGeneratedId" IS NOT NULL GROUP BY "communityId", "clientGeneratedId" HAVING COUNT(*) > 1) q'),
    duplicateExpenseClientIds: await count('SELECT COUNT(*) AS count FROM (SELECT 1 FROM "Expense" WHERE "clientGeneratedId" IS NOT NULL GROUP BY "communityId", "clientGeneratedId" HAVING COUNT(*) > 1) q'),
    multipleActiveEvents: await count('SELECT COUNT(*) AS count FROM (SELECT 1 FROM "Event" WHERE "isActive"=true AND status=\'ACTIVE\' GROUP BY "communityId" HAVING COUNT(*) > 1) q'),
    duplicateActiveDonationInvoices: await count('SELECT COUNT(*) AS count FROM (SELECT 1 FROM "Invoice" WHERE "donationId" IS NOT NULL AND status<>\'CANCELLED\' GROUP BY "communityId", "donationId" HAVING COUNT(*) > 1) q'),
    malformedInvoiceNumbers: await count('SELECT COUNT(*) AS count FROM "Invoice" WHERE "invoiceNumber" !~ \'^MF-[0-9]{4}-[A-Z0-9]{1,4}-[0-9]{5,}$\''),
    missingCommunityLogoAttachment: await count('SELECT COUNT(*) AS count FROM "Community" c LEFT JOIN "Attachment" a ON a.id=c."logoAttachmentId" WHERE c."logoAttachmentId" IS NOT NULL AND (a.id IS NULL OR a."communityId" IS DISTINCT FROM c.id)'),
    missingDonorAttachment: await count('SELECT COUNT(*) AS count FROM "Donor" d LEFT JOIN "Attachment" a ON a.id=d."profileAttachmentId" WHERE d."profileAttachmentId" IS NOT NULL AND (a.id IS NULL OR a."communityId" IS DISTINCT FROM d."communityId")'),
    missingDonationAttachment: await count('SELECT COUNT(*) AS count FROM "Donation" d LEFT JOIN "Attachment" a ON a.id=d."proofAttachmentId" WHERE d."proofAttachmentId" IS NOT NULL AND (a.id IS NULL OR a."communityId" IS DISTINCT FROM d."communityId")'),
    missingExpenseAttachment: await count('SELECT COUNT(*) AS count FROM "Expense" e LEFT JOIN "Attachment" a ON a.id=e."receiptAttachmentId" WHERE e."receiptAttachmentId" IS NOT NULL AND (a.id IS NULL OR a."communityId" IS DISTINCT FROM e."communityId")'),
    missingInvoiceAttachment: await count('SELECT COUNT(*) AS count FROM "Invoice" i LEFT JOIN "Attachment" a ON a.id=i."pdfAttachmentId" WHERE i."pdfAttachmentId" IS NOT NULL AND (a.id IS NULL OR a."communityId" IS DISTINCT FROM i."communityId")'),
    incorrectInvoiceSequenceMaxima: await optionalCount('InvoiceSequence', `
      SELECT COUNT(*) AS count FROM (
        SELECT i."communityId", EXTRACT(YEAR FROM i."issueDate")::INTEGER AS year,
          MAX((regexp_match(i."invoiceNumber", '-([0-9]+)$'))[1]::INTEGER) AS expected, s.current
        FROM "Invoice" i
        LEFT JOIN "InvoiceSequence" s ON s."communityId"=i."communityId" AND s.year=EXTRACT(YEAR FROM i."issueDate")::INTEGER
        GROUP BY i."communityId", EXTRACT(YEAR FROM i."issueDate")::INTEGER, s.current
        HAVING s.current IS NULL OR s.current <> MAX((regexp_match(i."invoiceNumber", '-([0-9]+)$'))[1]::INTEGER)
      ) q
    `),
  };

  const migrationActions = {
    invalidPasswordHashesToDisable: await count('SELECT COUNT(*) AS count FROM "User" WHERE "passwordHash" IS NULL OR "passwordHash" = \'\' OR ("passwordHash" NOT LIKE \'$2%\' AND "passwordHash" NOT LIKE \'$argon2id$%\')'),
    legacyInvitationsToRemove: await optionalCount('CommunityInvitation', 'SELECT COUNT(*) AS count FROM "CommunityInvitation"'),
  };

  const failed = Object.entries(blockers).filter(([, value]) => value > 0);
  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    status: failed.length === 0 ? 'PASS' : 'BLOCKED',
    blockers,
    migrationActions,
  };
  const json = `${JSON.stringify(report, null, 2)}\n`;
  process.stdout.write(json);
  if (process.env.PREFLIGHT_REPORT_PATH) {
    await writeFile(process.env.PREFLIGHT_REPORT_PATH, json, { encoding: 'utf8', flag: 'wx' });
  }
  if (failed.length > 0) throw new Error(`Security migration blocked by ${failed.length} invariant violation(s)`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
