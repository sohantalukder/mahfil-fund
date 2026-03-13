import ExcelJS from 'exceljs';
import { Parser as CsvParser } from '@json2csv/plainjs';
import { createRequire } from 'node:module';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TDocumentDefinitions = any;
import type { PrismaClient } from '@prisma/client';
import { formatDate, formatCurrencyBDT } from '@mahfil/utils';

const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const pdfmake = _require('pdfmake');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const RobotoFont = _require('pdfmake/build/fonts/Roboto.js');

// Register Roboto font once at startup.
// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
Object.entries(RobotoFont.vfs as Record<string, { data: number[] }>).forEach(([k, v]) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  pdfmake.virtualfs.writeFileSync(k, Buffer.from(new Uint8Array(v.data)));
});
// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
pdfmake.addFonts(RobotoFont.fonts as Record<string, unknown>);
// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
pdfmake.setUrlAccessPolicy(() => ({ allowed: false }));

export type ReportFormat = 'pdf' | 'xlsx' | 'csv';
export type ReportType =
  | 'donation_summary'
  | 'expense_summary'
  | 'donor_totals'
  | 'event_summary'
  | 'balance_summary'
  | 'payment_method_summary';

export interface ReportFilters {
  communityId: string;
  eventId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  donorId?: string;
  paymentMethod?: string;
}

export interface ReportRow {
  [key: string]: string | number | undefined;
}


async function fetchReportData(
  prisma: PrismaClient,
  type: ReportType,
  filters: ReportFilters
): Promise<{ title: string; columns: string[]; rows: ReportRow[] }> {
  const dateFilter =
    filters.dateFrom || filters.dateTo
      ? { gte: filters.dateFrom, lte: filters.dateTo }
      : undefined;

  switch (type) {
    case 'donation_summary': {
      const donations = await prisma.donation.findMany({
        where: {
          communityId: filters.communityId,
          status: 'ACTIVE',
          eventId: filters.eventId,
          donorId: filters.donorId,
          paymentMethod: filters.paymentMethod as never,
          donationDate: dateFilter
        },
        include: { event: { select: { name: true } } },
        orderBy: { donationDate: 'desc' }
      });

      return {
        title: 'Donation Summary',
        columns: ['Date', 'Donor Name', 'Phone', 'Amount (BDT)', 'Payment Method', 'Event', 'Receipt No', 'Note'],
        rows: donations.map((d) => ({
          Date: formatDate(d.donationDate, 'en-US'),
          'Donor Name': d.donorSnapshotName,
          Phone: d.donorSnapshotPhone,
          'Amount (BDT)': d.amount,
          'Payment Method': d.paymentMethod,
          Event: d.event.name,
          'Receipt No': d.receiptNo ?? '',
          Note: d.note ?? ''
        }))
      };
    }

    case 'expense_summary': {
      const expenses = await prisma.expense.findMany({
        where: {
          communityId: filters.communityId,
          status: 'ACTIVE',
          eventId: filters.eventId,
          expenseDate: dateFilter
        },
        include: { event: { select: { name: true } } },
        orderBy: { expenseDate: 'desc' }
      });

      return {
        title: 'Expense Summary',
        columns: ['Date', 'Title', 'Category', 'Amount (BDT)', 'Payment Method', 'Vendor', 'Event', 'Note'],
        rows: expenses.map((e) => ({
          Date: formatDate(e.expenseDate, 'en-US'),
          Title: e.title,
          Category: e.category,
          'Amount (BDT)': e.amount,
          'Payment Method': e.paymentMethod,
          Vendor: e.vendor ?? '',
          Event: e.event.name,
          Note: e.note ?? ''
        }))
      };
    }

    case 'donor_totals': {
      const grouped = await prisma.donation.groupBy({
        by: ['donorId', 'donorSnapshotName', 'donorSnapshotPhone'],
        where: {
          communityId: filters.communityId,
          status: 'ACTIVE',
          eventId: filters.eventId,
          donationDate: dateFilter
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } }
      });

      return {
        title: 'Donor Totals',
        columns: ['Donor Name', 'Phone', 'Total Amount (BDT)', 'Donation Count'],
        rows: grouped.map((g) => ({
          'Donor Name': g.donorSnapshotName,
          Phone: g.donorSnapshotPhone,
          'Total Amount (BDT)': g._sum.amount ?? 0,
          'Donation Count': g._count.id
        }))
      };
    }

    case 'balance_summary': {
      const eventFilter = filters.eventId ? { id: filters.eventId } : undefined;
      const events = await prisma.event.findMany({
        where: { communityId: filters.communityId, status: 'ACTIVE', ...eventFilter },
        include: {
          donations: { where: { status: 'ACTIVE' }, select: { amount: true } },
          expenses: { where: { status: 'ACTIVE' }, select: { amount: true } }
        }
      });

      return {
        title: 'Balance Summary',
        columns: ['Event', 'Year', 'Total Collections (BDT)', 'Total Expenses (BDT)', 'Balance (BDT)'],
        rows: events.map((e) => {
          const collections = e.donations.reduce((s, d) => s + d.amount, 0);
          const expenses = e.expenses.reduce((s, ex) => s + ex.amount, 0);
          return {
            Event: e.name,
            Year: e.year,
            'Total Collections (BDT)': collections,
            'Total Expenses (BDT)': expenses,
            'Balance (BDT)': collections - expenses
          };
        })
      };
    }

    case 'payment_method_summary': {
      const grouped = await prisma.donation.groupBy({
        by: ['paymentMethod'],
        where: {
          communityId: filters.communityId,
          status: 'ACTIVE',
          eventId: filters.eventId,
          donationDate: dateFilter
        },
        _sum: { amount: true },
        _count: { id: true }
      });

      return {
        title: 'Payment Method Summary',
        columns: ['Payment Method', 'Total Amount (BDT)', 'Count'],
        rows: grouped.map((g) => ({
          'Payment Method': g.paymentMethod,
          'Total Amount (BDT)': g._sum.amount ?? 0,
          Count: g._count.id
        }))
      };
    }

    default: {
      return { title: 'Report', columns: [], rows: [] };
    }
  }
}

export async function generateReport(
  prisma: PrismaClient,
  type: ReportType,
  format: ReportFormat,
  filters: ReportFilters,
  communityName: string
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const { title, columns, rows } = await fetchReportData(prisma, type, filters);
  const dateStr = new Date().toISOString().split('T')[0];
  const baseFilename = `${title.toLowerCase().replace(/\s+/g, '-')}-${dateStr}`;

  if (format === 'csv') {
    const parser = new CsvParser({ fields: columns });
    const csv = parser.parse(rows);
    return {
      buffer: Buffer.from(csv, 'utf-8'),
      contentType: 'text/csv; charset=utf-8',
      filename: `${baseFilename}.csv`
    };
  }

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mahfil Fund';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(title);

    // Header row
    sheet.addRow([`${communityName} - ${title}`]).font = { bold: true, size: 14 };
    sheet.addRow([`Generated: ${new Date().toLocaleString('en-US')}`]);
    sheet.addRow([]);

    const headerRow = sheet.addRow(columns);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F7B53' } };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const row of rows) {
      sheet.addRow(columns.map((c) => row[c] ?? ''));
    }

    // Auto-width columns
    sheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = String(cell.value ?? '').length;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 2, 40);
    });

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${baseFilename}.xlsx`
    };
  }

  // PDF
  const docDef: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 60],
    defaultStyle: { font: 'Roboto', fontSize: 9 },
    content: [
      { text: communityName, fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
      { text: title, fontSize: 12, alignment: 'center', color: '#4B5563', margin: [0, 0, 0, 4] },
      { text: `Generated: ${new Date().toLocaleString('en-US')}`, fontSize: 8, alignment: 'center', color: '#9CA3AF', margin: [0, 0, 0, 20] },
      {
        table: {
          headerRows: 1,
          widths: columns.map(() => '*'),
          body: [
            columns.map((c) => ({ text: c, fillColor: '#0F7B53', color: '#FFFFFF', bold: true })),
            ...rows.map((r) => columns.map((c) => String(r[c] ?? '')))
          ]
        },
        layout: { hLineColor: () => '#E5E7EB', vLineColor: () => '#E5E7EB' }
      }
    ],
    footer: (page: number, pages: number) => ({ text: `${communityName} — Page ${page} of ${pages}`, fontSize: 8, color: '#9CA3AF', alignment: 'center', margin: [40, 0] })
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const buffer = Buffer.from(await pdfmake.createPdf(docDef).getBuffer() as Uint8Array);
  return { buffer, contentType: 'application/pdf', filename: `${baseFilename}.pdf` };
}
