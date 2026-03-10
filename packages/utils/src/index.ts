export function nowIso(): string {
  return new Date().toISOString();
}

export function formatCurrencyBDT(amount: number, locale: 'bn-BD' | 'en-US' = 'bn-BD'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(
    amount
  );
}

export function formatDate(date: Date | string, locale: 'bn-BD' | 'en-US' = 'bn-BD'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
}

export function uuid(): string {
  // Works in Node 19+ and modern browsers; RN will polyfill separately.
  return globalThis.crypto?.randomUUID?.() ?? fallbackUuid();
}

function fallbackUuid(): string {
  // RFC4122 v4-ish fallback (non-crypto); only used when crypto.randomUUID absent.
  const s = Array.from({ length: 36 }, (_, i) => {
    if (i === 8 || i === 13 || i === 18 || i === 23) return '-';
    const r = Math.floor(Math.random() * 16);
    if (i === 14) return '4';
    if (i === 19) return ((r & 0x3) | 0x8).toString(16);
    return r.toString(16);
  });
  return s.join('');
}

