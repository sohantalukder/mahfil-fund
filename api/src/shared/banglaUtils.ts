const ONES_BN = ['', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়'];
const TENS_BN = ['', 'দশ', 'বিশ', 'ত্রিশ', 'চল্লিশ', 'পঞ্চাশ', 'ষাট', 'সত্তর', 'আশি', 'নব্বই'];
const TEENS_BN = [
  'দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো',
  'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ'
];

function twoDigitBn(n: number): string {
  if (n === 0) return '';
  if (n < 10) return ONES_BN[n] ?? '';
  if (n < 20) return TEENS_BN[n - 10] ?? '';
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return (TENS_BN[ten] ?? '') + (one > 0 ? ' ' + (ONES_BN[one] ?? '') : '');
}

function chunkToBn(n: number): string {
  if (n === 0) return '';
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  let result = '';
  if (hundred > 0) result += (ONES_BN[hundred] ?? '') + ' শত';
  if (rest > 0) result += (result ? ' ' : '') + twoDigitBn(rest);
  return result;
}

export function amountToWordsBangla(amount: number): string {
  if (amount === 0) return 'শূন্য টাকা';

  const crore = Math.floor(amount / 10_000_000);
  const lakh = Math.floor((amount % 10_000_000) / 100_000);
  const thousand = Math.floor((amount % 100_000) / 1_000);
  const rest = amount % 1_000;

  const parts: string[] = [];
  if (crore > 0) parts.push(chunkToBn(crore) + ' কোটি');
  if (lakh > 0) parts.push(chunkToBn(lakh) + ' লক্ষ');
  if (thousand > 0) parts.push(chunkToBn(thousand) + ' হাজার');
  if (rest > 0) parts.push(chunkToBn(rest));

  return parts.join(' ') + ' টাকা';
}

export function toBanglaDigits(num: number | string): string {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bn[parseInt(d)] ?? d);
}
