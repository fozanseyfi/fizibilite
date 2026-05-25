import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTl(n: number, opts: { compact?: boolean; decimals?: number } = {}): string {
  if (!Number.isFinite(n)) return '—';
  const { compact = false, decimals = 0 } = opts;
  if (compact) {
    const abs = Math.abs(n);
    if (abs >= 1e9) return `${(n / 1e9).toFixed(2)} Mr ₺`;
    if (abs >= 1e6) return `${(n / 1e6).toFixed(2)} M ₺`;
    if (abs >= 1e3) return `${(n / 1e3).toFixed(1)} B ₺`;
  }
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(n);
}

export function formatUsd(n: number, opts: { compact?: boolean; decimals?: number } = {}): string {
  if (!Number.isFinite(n)) return '—';
  const { compact = false, decimals = 0 } = opts;
  if (compact) {
    const abs = Math.abs(n);
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(n);
}

export type Currency = 'TL' | 'USD';

/**
 * Para birimi bilinçli formatlayıcı. TL → USD çevirisi `usdTry` ile yapılır.
 */
export function formatMoney(tlValue: number, currency: Currency, usdTry: number, opts: { compact?: boolean; decimals?: number } = {}): string {
  if (currency === 'USD') return formatUsd(tlValue / (usdTry || 1), opts);
  return formatTl(tlValue, opts);
}

export function formatKwh(n: number, opts: { compact?: boolean } = {}): string {
  if (!Number.isFinite(n)) return '—';
  if (opts.compact) {
    const abs = Math.abs(n);
    if (abs >= 1e6) return `${(n / 1e6).toFixed(2)} GWh`;
    if (abs >= 1e3) return `${(n / 1e3).toFixed(1)} MWh`;
  }
  return `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n)} kWh`;
}

export function formatPct(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(decimals)}%`;
}

export function formatYears(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 100) return '>100 yıl';
  return `${n.toFixed(1)} yıl`;
}

export function uid(prefix = 'p'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** ISO tarih → "25 Mayıs 2026" Türkçe gösterim */
export function formatDate(iso: string | Date): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** ISO datetime → "25 May 2026, 14:30" */
export function formatDateTime(iso: string | Date): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Date → "YYYY-MM-DD" */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Tarihe gün ekle (yeni Date döner, orijinal mutate edilmez) */
export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}
