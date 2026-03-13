import { createRequire } from 'node:module';
// pdfmake types may be incomplete; use any-cast where needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TDocumentDefinitions = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StyleDictionary = any;

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
import { amountToWordsBangla, toBanglaDigits } from '../shared/banglaUtils.js';
import { formatDate } from '@mahfil/utils';


const styles: StyleDictionary = {
  header: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
  subheader: { fontSize: 12, alignment: 'center', margin: [0, 0, 0, 20], color: '#4B5563' },
  invoiceTitle: { fontSize: 22, bold: true, alignment: 'center', margin: [0, 0, 0, 8] },
  sectionLabel: { fontSize: 9, color: '#6B7280', bold: false },
  sectionValue: { fontSize: 11, bold: true, color: '#111827' },
  tableHeader: { fontSize: 9, bold: true, fillColor: '#F3F4F6', color: '#374151' },
  amountBox: { fontSize: 14, bold: true, color: '#0F7B53' },
  amountWords: { fontSize: 10, italics: true, color: '#374151' },
  footer: { fontSize: 8, color: '#9CA3AF', alignment: 'center' }
};

export interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: Date | string;
  communityName: string;
  communityLocation?: string;
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

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const amountBn = amountToWordsBangla(data.amount);
  const amountFormatted = `৳${data.amount.toLocaleString('bn-BD')}`;
  const dateFormatted = formatDate(data.issueDate, 'bn-BD');

  const invoiceTitle =
    data.invoiceType === 'DONATION_RECEIPT'
      ? 'অনুদান রসিদ'
      : data.invoiceType === 'SPONSOR_RECEIPT'
        ? 'স্পনসর রসিদ'
        : 'ইনভয়েস';

  const paymentMethodLabels: Record<string, string> = {
    CASH: 'নগদ',
    BKASH: 'বিকাশ',
    NAGAD: 'নগদ (নগদ অ্যাপ)',
    BANK: 'ব্যাংক ট্রান্সফার'
  };

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A5',
    pageMargins: [30, 30, 30, 50],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    styles,
    content: [
      // Header
      { text: data.communityName, style: 'header' },
      { text: data.communityLocation ?? '', style: 'subheader' },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 480, y2: 0, lineWidth: 1.5, lineColor: '#0F7B53' }],
        margin: [0, 0, 0, 12]
      },

      // Invoice title
      { text: invoiceTitle, style: 'invoiceTitle' },
      ...(data.eventName ? [{ text: data.eventName, style: 'subheader' }] : []),
      {
        columns: [
          { text: [{ text: 'রসিদ নম্বর: ', style: 'sectionLabel' }, { text: data.invoiceNumber, style: 'sectionValue' }] },
          { text: [{ text: 'তারিখ: ', style: 'sectionLabel' }, { text: dateFormatted, style: 'sectionValue' }], alignment: 'right' }
        ],
        margin: [0, 0, 0, 16]
      },

      // Divider
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 480, y2: 0, lineWidth: 0.5, lineColor: '#E5E7EB' }],
        margin: [0, 0, 0, 12]
      },

      // Payer details
      {
        table: {
          widths: ['35%', '65%'],
          body: [
            [{ text: 'নাম', style: 'sectionLabel' }, { text: data.payerName, style: 'sectionValue' }],
            [{ text: 'মোবাইল নম্বর', style: 'sectionLabel' }, { text: data.payerPhone ?? '—', style: 'sectionValue' }],
            [{ text: 'ঠিকানা', style: 'sectionLabel' }, { text: data.payerAddress ?? '—', style: 'sectionValue' }],
            ...(data.paymentMethod ? [
              [{ text: 'পেমেন্ট পদ্ধতি', style: 'sectionLabel' }, { text: paymentMethodLabels[data.paymentMethod] ?? data.paymentMethod, style: 'sectionValue' }]
            ] : []),
            ...(data.referenceNumber ? [
              [{ text: 'রেফারেন্স নম্বর', style: 'sectionLabel' }, { text: data.referenceNumber, style: 'sectionValue' }]
            ] : [])
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 20]
      },

      // Amount box
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: 'টাকার পরিমাণ', style: 'sectionLabel', alignment: 'center' },
              { text: amountFormatted, style: 'amountBox', alignment: 'center', margin: [0, 4, 0, 4] },
              { text: `(${amountBn})`, style: 'amountWords', alignment: 'center' }
            ],
            fillColor: '#F0FDF4',
            margin: [10, 12, 10, 12]
          }]]
        },
        layout: { hLineColor: () => '#16A34A', vLineColor: () => '#16A34A' },
        margin: [0, 0, 0, 20]
      },

      ...(data.note ? [{ text: `টীকা: ${data.note}`, fontSize: 9, color: '#6B7280', margin: [0, 0, 0, 20] as [number, number, number, number] }] : []),

      // Signature area
      {
        columns: [
          {
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 0.5, lineColor: '#9CA3AF' }] },
              { text: 'গ্রহীতার স্বাক্ষর', style: 'sectionLabel', margin: [0, 4, 0, 0] }
            ]
          },
          {
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 0.5, lineColor: '#9CA3AF' }] },
              { text: 'কমিটির স্বাক্ষর', style: 'sectionLabel', margin: [0, 4, 0, 0] }
            ],
            alignment: 'right'
          }
        ],
        margin: [0, 10, 0, 0]
      }
    ],
    footer: (page: number, pages: number) => ({
      text: `পৃষ্ঠা ${toBanglaDigits(page)} / ${toBanglaDigits(pages)} — ${data.communityName}`,
      style: 'footer',
      margin: [30, 0]
    })
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return Buffer.from(await pdfmake.createPdf(docDefinition).getBuffer() as Uint8Array);
}

export async function generateInvoicePdfAsync(data: InvoicePdfData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return Buffer.from(await pdfmake.createPdf(buildDocDefinition(data)).getBuffer() as Uint8Array);
}

function buildDocDefinition(data: InvoicePdfData): TDocumentDefinitions {
  const amountBn = amountToWordsBangla(data.amount);
  const amountFormatted = `৳${data.amount.toLocaleString('en-US')}`;
  const dateFormatted = new Date(data.issueDate).toLocaleDateString('bn-BD');

  const invoiceTitle =
    data.invoiceType === 'DONATION_RECEIPT' ? 'অনুদান রসিদ'
      : data.invoiceType === 'SPONSOR_RECEIPT' ? 'স্পনসর রসিদ'
        : 'ইনভয়েস';

  const paymentMethodLabels: Record<string, string> = {
    CASH: 'নগদ', BKASH: 'বিকাশ', NAGAD: 'নগদ', BANK: 'ব্যাংক'
  };

  return {
    pageSize: 'A5',
    pageMargins: [30, 30, 30, 50],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    styles,
    content: [
      { text: data.communityName, style: 'header' },
      { text: data.communityLocation ?? '', style: 'subheader' },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 480, y2: 0, lineWidth: 1.5, lineColor: '#0F7B53' }], margin: [0, 0, 0, 12] },
      { text: invoiceTitle, style: 'invoiceTitle' },
      ...(data.eventName ? [{ text: data.eventName, style: 'subheader' as const }] : []),
      {
        columns: [
          { text: [{ text: 'রসিদ নম্বর: ', style: 'sectionLabel' }, { text: data.invoiceNumber, style: 'sectionValue' }] },
          { text: [{ text: 'তারিখ: ', style: 'sectionLabel' }, { text: dateFormatted, style: 'sectionValue' }], alignment: 'right' }
        ],
        margin: [0, 0, 0, 16]
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 480, y2: 0, lineWidth: 0.5, lineColor: '#E5E7EB' }], margin: [0, 0, 0, 12] },
      {
        table: {
          widths: ['35%', '65%'],
          body: [
            [{ text: 'নাম', style: 'sectionLabel' }, { text: data.payerName, style: 'sectionValue' }],
            [{ text: 'মোবাইল নম্বর', style: 'sectionLabel' }, { text: data.payerPhone ?? '—', style: 'sectionValue' }],
            [{ text: 'ঠিকানা', style: 'sectionLabel' }, { text: data.payerAddress ?? '—', style: 'sectionValue' }],
            ...(data.paymentMethod ? [[{ text: 'পেমেন্ট পদ্ধতি', style: 'sectionLabel' }, { text: paymentMethodLabels[data.paymentMethod] ?? data.paymentMethod, style: 'sectionValue' }]] : []),
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 20]
      },
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: 'টাকার পরিমাণ', style: 'sectionLabel', alignment: 'center' },
              { text: amountFormatted, style: 'amountBox', alignment: 'center', margin: [0, 4, 0, 4] },
              { text: `(${amountBn})`, style: 'amountWords', alignment: 'center' }
            ],
            fillColor: '#F0FDF4',
            margin: [10, 12, 10, 12]
          }]]
        },
        layout: { hLineColor: () => '#16A34A', vLineColor: () => '#16A34A' },
        margin: [0, 0, 0, 20]
      },
      ...(data.note ? [{ text: `টীকা: ${data.note}`, fontSize: 9, color: '#6B7280', margin: [0, 0, 0, 20] as [number, number, number, number] }] : []),
      {
        columns: [
          { stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 0.5, lineColor: '#9CA3AF' }] }, { text: 'গ্রহীতার স্বাক্ষর', style: 'sectionLabel', margin: [0, 4, 0, 0] }] },
          { stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 0.5, lineColor: '#9CA3AF' }] }, { text: 'কমিটির স্বাক্ষর', style: 'sectionLabel', margin: [0, 4, 0, 0] }], alignment: 'right' }
        ],
        margin: [0, 10, 0, 0]
      }
    ],
    footer: (page: number, pages: number) => ({ text: `${data.communityName} — পৃষ্ঠা ${page}/${pages}`, style: 'footer', margin: [30, 0] })
  };
}
