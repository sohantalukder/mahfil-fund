/**
 * invoicePdf.ts
 * Clean, minimal white receipt design with logo support.
 * Uses NotoSansBengali for full Bengali glyph rendering (no tofu boxes).
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TDocumentDefinitions = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StyleDictionary = any;

const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const pdfmake = _require('pdfmake');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const RobotoFont = _require('pdfmake/build/fonts/Roboto.js');

// ── Register Roboto ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
Object.entries(RobotoFont.vfs as Record<string, { data: string | number[] }>).forEach(([k, v]) => {
  const raw = v?.data;
  const buf =
    typeof raw === 'string'
      ? Buffer.from(raw, 'base64')
      : Buffer.from(new Uint8Array(raw ?? []));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  pdfmake.virtualfs.writeFileSync(k, buf);
});

// ── Register NotoSansBengali (Regular + Bold) ─────────────────────────────────
// CRITICAL: Both weights must be registered separately. Using only Regular for
// bold causes pdfmake to fall back to Roboto, which has no Bengali glyphs → □□□.
const NOTO_REGULAR = 'NotoSansBengali-Regular.ttf';
const NOTO_BOLD    = 'NotoSansBengali-Bold.ttf';
const fontsDir     = new URL('../assets/fonts/', import.meta.url);

function looksLikeTtf(buf: Buffer): boolean {
  // Common cases:
  // - TrueType: 00 01 00 00
  // - OpenType: 'OTTO'
  // - Git LFS pointer text: starts with 'version https://git-lfs'
  if (buf.length < 4) return false;
  const first4 = buf.subarray(0, 4);
  const asStr = buf.subarray(0, 32).toString('utf8');
  if (asStr.startsWith('version https://git-lfs')) return false;
  if (first4[0] === 0x00 && first4[1] === 0x01 && first4[2] === 0x00 && first4[3] === 0x00) return true;
  if (first4.toString('utf8') === 'OTTO') return true;
  if (first4.toString('utf8') === 'true') return true;
  if (first4.toString('utf8') === 'typ1') return true;
  return false;
}

let HAS_NOTO_BN = false;
try {
  const notoRegularBuf = fs.readFileSync(new URL(NOTO_REGULAR, fontsDir));
  if (looksLikeTtf(notoRegularBuf)) {
    pdfmake.virtualfs.writeFileSync(NOTO_REGULAR, notoRegularBuf);
    HAS_NOTO_BN = true;
  }
} catch {
  HAS_NOTO_BN = false;
}

const boldPath = new URL(NOTO_BOLD, fontsDir);
let boldFile = NOTO_REGULAR;
if (HAS_NOTO_BN && fs.existsSync(boldPath.pathname)) {
  try {
    const notoBoldBuf = fs.readFileSync(boldPath);
    if (looksLikeTtf(notoBoldBuf)) {
      pdfmake.virtualfs.writeFileSync(NOTO_BOLD, notoBoldBuf);
      boldFile = NOTO_BOLD;
    }
  } catch {
    // keep regular
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
pdfmake.addFonts(
  {
    ...(RobotoFont.fonts as Record<string, unknown>),
    ...(HAS_NOTO_BN
      ? {
          NotoSansBengali: {
            normal: NOTO_REGULAR,
            bold: boldFile,
            italics: NOTO_REGULAR,
            bolditalics: boldFile,
          },
        }
      : {}),
  } as Record<string, unknown>
);

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
pdfmake.setUrlAccessPolicy(() => ({ allowed: false }));

import { amountToWordsBangla, toBanglaDigits } from '../shared/banglaUtils.js';
import { formatDate } from '@mahfil/utils';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  primary:  '#0D6E4F',
  dark:     '#111827',
  mid:      '#374151',
  muted:    '#9CA3AF',
  border:   '#E5E7EB',
  borderLt: '#F3F4F6',
  bg:       '#FAFAFA',
  amber:    '#F59E0B',
  amberBg:  '#FFFBEB',
  amberTxt: '#92400E',
};

// ── Style dictionary ──────────────────────────────────────────────────────────
const styles: StyleDictionary = {
  orgName:     { fontSize: 15, bold: true,    color: C.dark },
  orgLocation: { fontSize: 9,  color: C.muted, margin: [0, 2, 0, 0] },
  communityName: { fontSize: 11, bold: true, color: C.dark },
  badgeText:   { fontSize: 9,  bold: true,    color: '#FFFFFF' },
  eventName:   { fontSize: 9,  italics: true, color: C.muted, alignment: 'center' },
  metaLabel:   { fontSize: 8,  color: C.muted },
  metaValue:   { fontSize: 11, bold: true,    color: C.dark },
  detailLabel: { fontSize: 9,  color: C.muted },
  detailValue: { fontSize: 10, bold: true,    color: C.dark },
  amountLabel: { fontSize: 8,  color: C.muted },
  amountValue: { fontSize: 22, bold: true,    color: C.primary },
  amountWords: { fontSize: 9,  italics: true, color: C.mid },
  noteText:    { fontSize: 8.5, color: C.amberTxt },
  sigLabel:    { fontSize: 8,  color: C.muted },
  footer:      { fontSize: 7.5, color: C.muted },
};

// ── Data interface ────────────────────────────────────────────────────────────
export interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: Date | string;
  communityName: string;
  communityLocation?: string;
  /** Pass either a bare base64 string or a full data-URL (data:image/png;base64,...) */
  logoBase64?: string;
  /** Alternatively, provide an absolute file-system path to the logo PNG/JPEG */
  logoPath?: string;
  payerName: string;
  payerPhone?: string;
  payerAddress?: string;
  amount: number;
  paymentMethod?: string;
  referenceNumber?: string;
  note?: string;
  invoiceType: 'DONATION_RECEIPT' | 'SPONSOR_RECEIPT' | 'MANUAL';
  eventName?: string;
}

export type InvoicesReportRow = {
  invoiceNumber: string;
  issueDate: Date | string;
  payerName: string;
  payerPhone?: string;
  invoiceType: 'DONATION_RECEIPT' | 'SPONSOR_RECEIPT' | 'MANUAL';
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
  eventName?: string;
  amount: number;
};

export type InvoicesReportPdfData = {
  title: string;
  communityName: string;
  communityLocation?: string;
  /** Pass either a bare base64 string or a full data-URL (data:image/png;base64,...) */
  logoBase64?: string;
  /** Alternatively, provide an absolute file-system path to the logo PNG/JPEG */
  logoPath?: string;
  generatedAt: Date | string;
  filters: {
    status?: 'DRAFT' | 'ISSUED' | 'CANCELLED';
    invoiceType?: 'DONATION_RECEIPT' | 'SPONSOR_RECEIPT' | 'MANUAL';
    minAmount?: number;
  };
  rows: InvoicesReportRow[];
};

export type DonationsReportRow = {
  donorSnapshotName: string;
  donorSnapshotPhone: string;
  amount: number;
  paymentMethod: string;
  donationDate: Date | string;
  receiptNo?: string;
  transactionId?: string;
};

export type DonationsReportPdfData = {
  title: string;
  communityName: string;
  communityLocation?: string;
  logoBase64?: string;
  logoPath?: string;
  generatedAt: Date | string;
  filters: { eventId: string; search?: string };
  rows: DonationsReportRow[];
};

export type ExpensesReportRow = {
  title: string;
  category: string;
  vendor?: string;
  amount: number;
  paymentMethod: string;
  expenseDate: Date | string;
};

export type ExpensesReportPdfData = {
  title: string;
  communityName: string;
  communityLocation?: string;
  logoBase64?: string;
  logoPath?: string;
  generatedAt: Date | string;
  filters: { eventId: string; search?: string };
  rows: ExpensesReportRow[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const PM_LABELS: Record<string, string> = {
  CASH:  'নগদ অর্থ',
  BKASH: 'বিকাশ',
  NAGAD: 'নগদ (অ্যাপ)',
  BANK:  'ব্যাংক ট্রান্সফার',
};

const INVOICE_TITLES: Record<string, string> = {
  DONATION_RECEIPT: 'অনুদান রসিদ',
  SPONSOR_RECEIPT:  'স্পনসর রসিদ',
  MANUAL:           'ইনভয়েস',
};

function containsBangla(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

function fontFor(text: string): 'NotoSansBengali' | 'Roboto' {
  return containsBangla(text) && HAS_NOTO_BN ? 'NotoSansBengali' : 'Roboto';
}

function txt<T extends Record<string, unknown>>(
  text: string,
  extra?: T
): { text: string; font: 'NotoSansBengali' | 'Roboto' } & T {
  return {
    text,
    font: fontFor(text),
    ...(extra ?? ({} as T)),
  };
}

/** Resolve logo data to a pdfmake image descriptor, or null if unavailable */
function resolveLogoImage(data: InvoicePdfData): object | null {
  try {
    let dataUrl: string | undefined;

    if (data.logoBase64) {
      dataUrl = data.logoBase64.startsWith('data:')
        ? data.logoBase64
        : `data:image/png;base64,${data.logoBase64}`;
    } else if (data.logoPath) {
      const raw = fs.readFileSync(data.logoPath);
      const ext = data.logoPath.split('.').pop()?.toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      dataUrl = `data:${mime};base64,${raw.toString('base64')}`;
    }

    if (!dataUrl) return null;

    return {
      image: dataUrl,
      fit: [150, 40],   // more prominent for recognizability
      margin: [0, 1, 10, 0],
    };
  } catch {
    // Logo missing or unreadable — degrade gracefully, receipt still renders
    return null;
  }
}

function resolveLogoImageAny(data: { logoBase64?: string; logoPath?: string }): object | null {
  try {
    let dataUrl: string | undefined;

    if (data.logoBase64) {
      dataUrl = data.logoBase64.startsWith('data:')
        ? data.logoBase64
        : `data:image/png;base64,${data.logoBase64}`;
    } else if (data.logoPath) {
      const raw = fs.readFileSync(data.logoPath);
      const ext = data.logoPath.split('.').pop()?.toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      dataUrl = `data:${mime};base64,${raw.toString('base64')}`;
    }

    if (!dataUrl) return null;

    return { image: dataUrl };
  } catch {
    return null;
  }
}

// ── Document builder ──────────────────────────────────────────────────────────
function buildDocDefinition(data: InvoicePdfData): TDocumentDefinitions {
  const amountBn        = amountToWordsBangla(data.amount);
  const amountFormatted = `৳${data.amount.toLocaleString('bn-BD')}`;
  const dateFormatted   = formatDate(data.issueDate, 'bn-BD');
  const invoiceTitle    = INVOICE_TITLES[data.invoiceType] ?? 'ইনভয়েস';
  const pmLabel         = data.paymentMethod
    ? (PM_LABELS[data.paymentMethod] ?? data.paymentMethod)
    : null;

  const logo = resolveLogoImage(data);

  // ── Header: row1 (logo + brand), row2 (community + badge) ─────────────────
  const brandRow = {
    columns: [
      ...(logo ? [{ ...logo, width: 'auto' }] : []),
      {
        stack: [
          ...(data.communityLocation
            ? [txt(data.communityLocation, { style: 'orgLocation' })]
            : []),
        ],
        width: '*',
      },
    ],
    columnGap: 8,
  };

  const badge = {
    table: {
      widths: ['auto'],
      body: [[{
        ...txt(invoiceTitle),
        style: 'badgeText',
        fillColor: C.primary,
        margin: [8, 3, 8, 3],
        border: [false, false, false, false],
      }]],
    },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
    alignment: 'right' as const,
    width: 'auto',
  };

  const metaRow = {
    columns: [
      txt(data.communityName, { style: 'communityName' }),
      badge,
    ],
    columnGap: 8,
    margin: [0, 6, 0, 0] as [number, number, number, number],
  };

  // ── Payer detail rows ─────────────────────────────────────────────────────
  const detailRows: object[][] = [
    [txt('নাম', { style: 'detailLabel' }),          txt(data.payerName || '—',    { style: 'detailValue' })],
    [txt('মোবাইল নম্বর', { style: 'detailLabel' }), txt(data.payerPhone ?? '—',   { style: 'detailValue' })],
    [txt('ঠিকানা', { style: 'detailLabel' }),       txt(data.payerAddress ?? '—', { style: 'detailValue' })],
    ...(pmLabel
      ? [[txt('পেমেন্ট পদ্ধতি', { style: 'detailLabel' }), txt(pmLabel, { style: 'detailValue' })]]
      : []),
    ...(data.referenceNumber
      ? [[txt('রেফারেন্স নম্বর', { style: 'detailLabel' }), txt(data.referenceNumber, { style: 'detailValue' })]]
      : []),
  ];

  return {
    pageSize: 'A5',
    pageMargins: [28, 28, 28, 44],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: C.dark },
    styles,

    content: [

      // ── 1. Header ──────────────────────────────────────────────────────────
      { stack: [brandRow, metaRow], margin: [0, 0, 0, 0] },

      // Separator
      {
        canvas: [{ type: 'rect', x: 0, y: 0, w: 455, h: 1, color: C.borderLt }],
        margin: [0, 10, 0, 10],
      },

      // ── 2. Invoice # and Date ──────────────────────────────────────────────
      {
        columns: [
          {
            stack: [
              txt('রসিদ নম্বর', { style: 'metaLabel' }),
              txt(data.invoiceNumber, { style: 'metaValue', margin: [0, 2, 0, 0] }),
            ],
          },
          {
            stack: [
              txt('তারিখ', { style: 'metaLabel', alignment: 'right' }),
              txt(dateFormatted, { style: 'metaValue', alignment: 'right', margin: [0, 2, 0, 0] }),
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },

      // Separator
      {
        canvas: [{ type: 'rect', x: 0, y: 0, w: 455, h: 1, color: C.borderLt }],
        margin: [0, 0, 0, 10],
      },

      // ── 3. Event name (optional) ───────────────────────────────────────────
      ...(data.eventName
        ? [txt(data.eventName, { style: 'eventName', margin: [0, 0, 0, 10] as [number,number,number,number] })]
        : []
      ),

      // ── 4. Payer details ───────────────────────────────────────────────────
      {
        table: {
          widths: ['36%', '64%'],
          body: detailRows.map(row =>
            row.map(cell => ({ ...cell, border: [false, false, false, false], margin: [0, 4, 0, 4] }))
          ),
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 14],
      },

      // ── 5. Amount box ──────────────────────────────────────────────────────
      {
        table: {
          widths: ['*'],
          body: [[{
            columns: [
              {
                stack: [
                  txt('টাকার পরিমাণ', { style: 'amountLabel', margin: [0, 0, 0, 5] }),
                  txt(`(${amountBn})`, { style: 'amountWords' }),
                ],
                width: '*',
              },
              {
                ...txt(amountFormatted),
                style: 'amountValue',
                alignment: 'right',
                width: 'auto',
              },
            ],
            margin: [14, 12, 14, 12],
            fillColor: C.bg,
            border: [true, true, true, true],
          }]],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => C.border,
          vLineColor: () => C.border,
        },
        margin: [0, 0, 0, 14],
      },

      // ── 6. Note (optional) ─────────────────────────────────────────────────
      ...(data.note
        ? [{
            table: {
              widths: ['*'],
              body: [[{
                ...txt(`টীকা: ${data.note}`),
                style: 'noteText',
                fillColor: C.amberBg,
                margin: [10, 7, 10, 7],
                border: [true, true, true, true],
              }]],
            },
            layout: {
              hLineWidth: () => 1,
              vLineWidth: (i: number) => (i === 0 ? 3 : 0),
              hLineColor: () => C.border,
              vLineColor: (i: number) => (i === 0 ? C.amber : 'transparent'),
            },
            margin: [0, 0, 0, 14],
          }]
        : []
      ),

      // ── 7. Signatures ──────────────────────────────────────────────────────
      {
        canvas: [{ type: 'rect', x: 0, y: 0, w: 455, h: 1, color: C.borderLt }],
        margin: [0, 0, 0, 14],
      },
      {
        columns: [
          {
            stack: [
              { text: ' ', margin: [0, 0, 0, 16] }, // extra gap before signature line
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 1, lineColor: C.border }] },
              txt('গ্রহীতার স্বাক্ষর', { style: 'sigLabel', margin: [0, 4, 0, 0] }),
            ],
            width: '*',
          },
          {
            stack: [
              { text: ' ', margin: [0, 0, 0, 16] }, // extra gap before signature line
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 1, lineColor: C.border }] },
              txt('কমিটির স্বাক্ষর', { style: 'sigLabel', alignment: 'right', margin: [0, 4, 0, 0] }),
            ],
            width: '*',
            alignment: 'right',
          },
        ],
        columnGap: 120,
      },
    ],

    // ── Footer ───────────────────────────────────────────────────────────────
    footer: (page: number, pages: number) => ({
      columns: [
        txt(data.communityName, { style: 'footer', alignment: 'left' }),
        {
          ...txt(`পৃষ্ঠা ${toBanglaDigits(page)} / ${toBanglaDigits(pages)}`),
          style: 'footer',
          alignment: 'right',
        },
      ],
      margin: [28, 12],
    }),
  };
}

function buildInvoicesReportDocDefinition(data: InvoicesReportPdfData): TDocumentDefinitions {
  const generatedAt = formatDate(data.generatedAt, 'en-US');
  const logo = resolveLogoImageAny({ logoBase64: data.logoBase64, logoPath: data.logoPath });
  const rtxt = <T extends Record<string, unknown>>(text: string, extra?: T) =>
    txt(text, { font: 'Roboto', ...(extra ?? ({} as T)) });

  const totalCount = data.rows.length;
  const totalAmount = data.rows.reduce((sum, r) => sum + (r.amount || 0), 0);

  const subtotalByType = data.rows.reduce<Record<string, { count: number; amount: number }>>((acc, r) => {
    const k = r.invoiceType;
    acc[k] ??= { count: 0, amount: 0 };
    acc[k].count += 1;
    acc[k].amount += r.amount || 0;
    return acc;
  }, {});

  const subtotalByStatus = data.rows.reduce<Record<string, { count: number; amount: number }>>((acc, r) => {
    const k = r.status;
    acc[k] ??= { count: 0, amount: 0 };
    acc[k].count += 1;
    acc[k].amount += r.amount || 0;
    return acc;
  }, {});

  const filterParts: string[] = [];
  if (data.filters.status) filterParts.push(`status=${data.filters.status}`);
  if (data.filters.invoiceType) filterParts.push(`type=${data.filters.invoiceType}`);
  if (typeof data.filters.minAmount === 'number') filterParts.push(`minAmount=${data.filters.minAmount}`);
  const filterLine = filterParts.length ? filterParts.join(' | ') : '—';

  const headerLeftStack: object[] = [
    rtxt(data.communityName, { fontSize: 14, bold: true, color: C.dark }),
    ...(data.communityLocation ? [rtxt(data.communityLocation, { fontSize: 9, color: C.muted })] : []),
    rtxt(data.title, { fontSize: 11, bold: true, color: C.primary, margin: [0, 6, 0, 0] }),
    rtxt(`Generated: ${generatedAt}`, { fontSize: 8.5, color: C.muted, margin: [0, 2, 0, 0] }),
    rtxt(`Filters: ${filterLine}`, { fontSize: 8.5, color: C.muted, margin: [0, 2, 0, 0] }),
  ];

  const header = {
    columns: [
      { stack: headerLeftStack, width: '*' },
      ...(logo
        ? [{ ...logo, fit: [140, 36], alignment: 'right' as const, margin: [0, 0, 0, 0] }]
        : []),
    ],
    columnGap: 12,
    margin: [0, 0, 0, 10] as [number, number, number, number],
  };

  const tableHeader = [
    rtxt('Invoice #', { bold: true }),
    rtxt('Date', { bold: true }),
    rtxt('Payer', { bold: true }),
    rtxt('Phone', { bold: true }),
    rtxt('Type', { bold: true }),
    rtxt('Status', { bold: true }),
    rtxt('Event', { bold: true }),
    rtxt('Amount', { bold: true, alignment: 'right' }),
  ];

  const body = [
    tableHeader.map((c) => ({ ...c, fillColor: C.bg, margin: [6, 5, 6, 5] })),
    ...data.rows.map((r) => [
      { ...rtxt(r.invoiceNumber), margin: [6, 4, 6, 4] },
      { ...rtxt(formatDate(r.issueDate, 'en-US')), margin: [6, 4, 6, 4] },
      { ...rtxt(r.payerName), margin: [6, 4, 6, 4] },
      { ...rtxt(r.payerPhone ?? '—'), margin: [6, 4, 6, 4] },
      { ...rtxt(r.invoiceType), margin: [6, 4, 6, 4] },
      { ...rtxt(r.status), margin: [6, 4, 6, 4] },
      { ...rtxt(r.eventName ?? '—'), margin: [6, 4, 6, 4] },
      { ...rtxt(`৳${r.amount.toLocaleString('en-US')}`), alignment: 'right', margin: [6, 4, 6, 4] },
    ]),
  ];

  const totalsCard = {
    table: {
      widths: ['*', 'auto'],
      body: [
        [
          rtxt('Total invoices', { fontSize: 9, color: C.muted }),
          rtxt(String(totalCount), { fontSize: 10, bold: true, alignment: 'right' }),
        ],
        [
          rtxt('Total amount', { fontSize: 9, color: C.muted }),
          rtxt(`৳${totalAmount.toLocaleString('en-US')}`, { fontSize: 10, bold: true, alignment: 'right' }),
        ],
      ],
    },
    layout: 'noBorders',
    margin: [0, 10, 0, 0] as [number, number, number, number],
  };

  const subtotalLines: object[] = [];
  for (const [k, v] of Object.entries(subtotalByType)) {
    subtotalLines.push(
      {
        columns: [
          rtxt(`Type ${k}`, { fontSize: 8.5, color: C.muted }),
          rtxt(`${v.count} | ৳${v.amount.toLocaleString('en-US')}`, { fontSize: 8.5, alignment: 'right' }),
        ],
        margin: [0, 1, 0, 0] as [number, number, number, number],
      }
    );
  }
  for (const [k, v] of Object.entries(subtotalByStatus)) {
    subtotalLines.push(
      {
        columns: [
          rtxt(`Status ${k}`, { fontSize: 8.5, color: C.muted }),
          rtxt(`${v.count} | ৳${v.amount.toLocaleString('en-US')}`, { fontSize: 8.5, alignment: 'right' }),
        ],
        margin: [0, 1, 0, 0] as [number, number, number, number],
      }
    );
  }

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [24, 22, 24, 28],
    defaultStyle: { font: 'Roboto', fontSize: 9, color: C.dark },
    content: [
      header,
      {
        table: {
          headerRows: 1,
          widths: [86, 64, '*', 74, 90, 70, '*', 70],
          body,
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 ? 1 : 0.5),
          vLineWidth: () => 0.5,
          hLineColor: () => C.border,
          vLineColor: () => C.border,
        },
      },
      totalsCard,
      ...(subtotalLines.length
        ? [{ text: ' ', margin: [0, 2, 0, 0] }, { stack: subtotalLines, margin: [0, 2, 0, 0] }]
        : []),
    ],
    footer: (page: number, pages: number) => ({
      columns: [
        rtxt(data.communityName, { fontSize: 7.5, color: C.muted, alignment: 'left' }),
        {
          ...rtxt(`Page ${page} / ${pages}`),
          fontSize: 7.5,
          color: C.muted,
          alignment: 'right',
        },
      ],
      margin: [24, 10],
    }),
  };
}

function buildDonationsReportDocDefinition(data: DonationsReportPdfData): TDocumentDefinitions {
  const generatedAt = formatDate(data.generatedAt, 'en-US');
  const logo = resolveLogoImageAny({ logoBase64: data.logoBase64, logoPath: data.logoPath });
  const rtxt = <T extends Record<string, unknown>>(text: string, extra?: T) =>
    txt(text, { font: 'Roboto', ...(extra ?? ({} as T)) });

  const totalCount = data.rows.length;
  const totalAmount = data.rows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const subtotalByMethod = data.rows.reduce<Record<string, { count: number; amount: number }>>((acc, r) => {
    const k = r.paymentMethod || '—';
    acc[k] ??= { count: 0, amount: 0 };
    acc[k].count += 1;
    acc[k].amount += r.amount || 0;
    return acc;
  }, {});

  const filterLine = `eventId=${data.filters.eventId}${data.filters.search ? ` | search=${data.filters.search}` : ''}`;

  const header = {
    columns: [
      {
        stack: [
          rtxt(data.communityName, { fontSize: 14, bold: true, color: C.dark }),
          ...(data.communityLocation ? [rtxt(data.communityLocation, { fontSize: 9, color: C.muted })] : []),
          rtxt(data.title, { fontSize: 11, bold: true, color: C.primary, margin: [0, 6, 0, 0] }),
          rtxt(`Generated: ${generatedAt}`, { fontSize: 8.5, color: C.muted, margin: [0, 2, 0, 0] }),
          rtxt(`Filters: ${filterLine}`, { fontSize: 8.5, color: C.muted, margin: [0, 2, 0, 0] }),
        ],
        width: '*',
      },
      ...(logo ? [{ ...logo, fit: [140, 36], alignment: 'right' as const }] : []),
    ],
    columnGap: 12,
    margin: [0, 0, 0, 10] as [number, number, number, number],
  };

  const tableHeader = [
    rtxt('Donor', { bold: true }),
    rtxt('Phone', { bold: true }),
    rtxt('Method', { bold: true }),
    rtxt('Date', { bold: true }),
    rtxt('Receipt/Txn', { bold: true }),
    rtxt('Amount', { bold: true, alignment: 'right' }),
  ];

  const body = [
    tableHeader.map((c) => ({ ...c, fillColor: C.bg, margin: [6, 5, 6, 5] })),
    ...data.rows.map((r) => [
      { ...rtxt(r.donorSnapshotName), margin: [6, 4, 6, 4] },
      { ...rtxt(r.donorSnapshotPhone), margin: [6, 4, 6, 4] },
      { ...rtxt(r.paymentMethod), margin: [6, 4, 6, 4] },
      { ...rtxt(formatDate(r.donationDate, 'en-US')), margin: [6, 4, 6, 4] },
      { ...rtxt(r.receiptNo ?? r.transactionId ?? '—'), margin: [6, 4, 6, 4] },
      { ...rtxt(`৳${r.amount.toLocaleString('en-US')}`), alignment: 'right', margin: [6, 4, 6, 4] },
    ]),
  ];

  const subtotalLines: object[] = Object.entries(subtotalByMethod).map(([k, v]) => ({
    columns: [
      rtxt(`Method ${k}`, { fontSize: 8.5, color: C.muted }),
      rtxt(`${v.count} | ৳${v.amount.toLocaleString('en-US')}`, { fontSize: 8.5, alignment: 'right' }),
    ],
    margin: [0, 1, 0, 0] as [number, number, number, number],
  }));

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [24, 22, 24, 28],
    defaultStyle: { font: 'Roboto', fontSize: 9, color: C.dark },
    content: [
      header,
      {
        table: {
          headerRows: 1,
          widths: ['*', 90, 70, 70, 120, 80],
          body,
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 ? 1 : 0.5),
          vLineWidth: () => 0.5,
          hLineColor: () => C.border,
          vLineColor: () => C.border,
        },
      },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [rtxt('Total donations', { fontSize: 9, color: C.muted }), rtxt(String(totalCount), { bold: true, alignment: 'right' })],
            [rtxt('Total amount', { fontSize: 9, color: C.muted }), rtxt(`৳${totalAmount.toLocaleString('en-US')}`, { bold: true, alignment: 'right' })],
          ],
        },
        layout: 'noBorders',
        margin: [0, 10, 0, 0] as [number, number, number, number],
      },
      ...(subtotalLines.length ? [{ text: ' ', margin: [0, 2, 0, 0] }, { stack: subtotalLines }] : []),
    ],
    footer: (page: number, pages: number) => ({
      columns: [
        rtxt(data.communityName, { fontSize: 7.5, color: C.muted, alignment: 'left' }),
        { ...rtxt(`Page ${page} / ${pages}`), fontSize: 7.5, color: C.muted, alignment: 'right' },
      ],
      margin: [24, 10],
    }),
  };
}

function buildExpensesReportDocDefinition(data: ExpensesReportPdfData): TDocumentDefinitions {
  const generatedAt = formatDate(data.generatedAt, 'en-US');
  const logo = resolveLogoImageAny({ logoBase64: data.logoBase64, logoPath: data.logoPath });
  const rtxt = <T extends Record<string, unknown>>(text: string, extra?: T) =>
    txt(text, { font: 'Roboto', ...(extra ?? ({} as T)) });

  const totalCount = data.rows.length;
  const totalAmount = data.rows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const subtotalByCategory = data.rows.reduce<Record<string, { count: number; amount: number }>>((acc, r) => {
    const k = r.category || '—';
    acc[k] ??= { count: 0, amount: 0 };
    acc[k].count += 1;
    acc[k].amount += r.amount || 0;
    return acc;
  }, {});

  const filterLine = `eventId=${data.filters.eventId}${data.filters.search ? ` | search=${data.filters.search}` : ''}`;

  const header = {
    columns: [
      {
        stack: [
          rtxt(data.communityName, { fontSize: 14, bold: true, color: C.dark }),
          ...(data.communityLocation ? [rtxt(data.communityLocation, { fontSize: 9, color: C.muted })] : []),
          rtxt(data.title, { fontSize: 11, bold: true, color: C.primary, margin: [0, 6, 0, 0] }),
          rtxt(`Generated: ${generatedAt}`, { fontSize: 8.5, color: C.muted, margin: [0, 2, 0, 0] }),
          rtxt(`Filters: ${filterLine}`, { fontSize: 8.5, color: C.muted, margin: [0, 2, 0, 0] }),
        ],
        width: '*',
      },
      ...(logo ? [{ ...logo, fit: [140, 36], alignment: 'right' as const }] : []),
    ],
    columnGap: 12,
    margin: [0, 0, 0, 10] as [number, number, number, number],
  };

  const tableHeader = [
    rtxt('Title', { bold: true }),
    rtxt('Category', { bold: true }),
    rtxt('Vendor', { bold: true }),
    rtxt('Method', { bold: true }),
    rtxt('Date', { bold: true }),
    rtxt('Amount', { bold: true, alignment: 'right' }),
  ];

  const body = [
    tableHeader.map((c) => ({ ...c, fillColor: C.bg, margin: [6, 5, 6, 5] })),
    ...data.rows.map((r) => [
      { ...rtxt(r.title), margin: [6, 4, 6, 4] },
      { ...rtxt(r.category), margin: [6, 4, 6, 4] },
      { ...rtxt(r.vendor ?? '—'), margin: [6, 4, 6, 4] },
      { ...rtxt(r.paymentMethod), margin: [6, 4, 6, 4] },
      { ...rtxt(formatDate(r.expenseDate, 'en-US')), margin: [6, 4, 6, 4] },
      { ...rtxt(`৳${r.amount.toLocaleString('en-US')}`), alignment: 'right', margin: [6, 4, 6, 4] },
    ]),
  ];

  const subtotalLines: object[] = Object.entries(subtotalByCategory).map(([k, v]) => ({
    columns: [
      rtxt(`Category ${k}`, { fontSize: 8.5, color: C.muted }),
      rtxt(`${v.count} | ৳${v.amount.toLocaleString('en-US')}`, { fontSize: 8.5, alignment: 'right' }),
    ],
    margin: [0, 1, 0, 0] as [number, number, number, number],
  }));

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [24, 22, 24, 28],
    defaultStyle: { font: 'Roboto', fontSize: 9, color: C.dark },
    content: [
      header,
      {
        table: {
          headerRows: 1,
          widths: ['*', 120, 120, 70, 70, 80],
          body,
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 ? 1 : 0.5),
          vLineWidth: () => 0.5,
          hLineColor: () => C.border,
          vLineColor: () => C.border,
        },
      },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [rtxt('Total expenses', { fontSize: 9, color: C.muted }), rtxt(String(totalCount), { bold: true, alignment: 'right' })],
            [rtxt('Total amount', { fontSize: 9, color: C.muted }), rtxt(`৳${totalAmount.toLocaleString('en-US')}`, { bold: true, alignment: 'right' })],
          ],
        },
        layout: 'noBorders',
        margin: [0, 10, 0, 0] as [number, number, number, number],
      },
      ...(subtotalLines.length ? [{ text: ' ', margin: [0, 2, 0, 0] }, { stack: subtotalLines }] : []),
    ],
    footer: (page: number, pages: number) => ({
      columns: [
        rtxt(data.communityName, { fontSize: 7.5, color: C.muted, alignment: 'left' }),
        { ...rtxt(`Page ${page} / ${pages}`), fontSize: 7.5, color: C.muted, alignment: 'right' },
      ],
      margin: [24, 10],
    }),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return Buffer.from(await pdfmake.createPdf(buildDocDefinition(data)).getBuffer() as Uint8Array);
}

export async function generateInvoicesReportPdf(data: InvoicesReportPdfData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return Buffer.from(await pdfmake.createPdf(buildInvoicesReportDocDefinition(data)).getBuffer() as Uint8Array);
}

export async function generateDonationsReportPdf(data: DonationsReportPdfData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return Buffer.from(await pdfmake.createPdf(buildDonationsReportDocDefinition(data)).getBuffer() as Uint8Array);
}

export async function generateExpensesReportPdf(data: ExpensesReportPdfData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return Buffer.from(await pdfmake.createPdf(buildExpensesReportDocDefinition(data)).getBuffer() as Uint8Array);
}

// Alias kept for backwards compatibility
export const generateInvoicePdfAsync = generateInvoicePdf;