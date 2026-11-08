// Sadece-batarya (mevcut GES'e sonradan batarya) modellerinin ortak yardımcıları.

import { DAYS, SOLAR_M, SUN_EW, SUN_S, norm } from '@/lib/models/ci/presets';

export { irrOf, paybackOf } from '@/lib/models/ci/engine';

export type Zone = 'gece' | 'gunduz' | 'puant';

/** EPDK üç zamanlı tarife dilimleri: gündüz 06–17, puant 17–22, gece 22–06. */
export function zoneOf(h: number): Zone {
  if (h >= 6 && h < 17) return 'gunduz';
  if (h >= 17 && h < 22) return 'puant';
  return 'gece';
}

/** Ayın hafta içi / hafta sonu gün sayısı (modelin geri kalanıyla aynı kabul). */
export function calDays(mi: number): { wd: number; we: number } {
  let wd = 0, we = 0;
  for (let d = 0; d < DAYS[mi]; d++) (d % 7 >= 5 ? we++ : wd++);
  return { wd, we };
}

/** Bir günün saatlik GES üretimi (kWh) — C&I modelindeki eğrilerle aynı. */
export function pvDay(kwp: number, spec: number, orient: 's' | 'ew', mi: number, scale = 1): number[] {
  const sun = norm(orient === 'ew' ? SUN_EW : SUN_S);
  const day = (kwp * spec * SOLAR_M[mi]) / 100 / DAYS[mi] * scale;
  return sun.map((s) => s * day);
}

export function npvOf(c0: number, cfs: number[], r: number): number {
  return cfs.reduce((s, cf, i) => s + cf / Math.pow(1 + r, i + 1), -c0);
}

export function pvSum(vals: number[], r: number): number {
  return vals.reduce((s, v, i) => s + v / Math.pow(1 + r, i + 1), 0);
}

export const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);

/** Gün içi temsili profil (grafik için) */
export interface DayTrace {
  prod: number[];
  cons: number[];
  /** Bataryaya giren enerji (güneşten) */
  chSolar: number[];
  /** Bataryaya giren enerji (şebekeden) */
  chGrid: number[];
  /** Bataryadan çıkan enerji */
  dis: number[];
  /** Saat sonu doluluk (depolanan, kWh) */
  soc: number[];
}

export const emptyTrace = (): DayTrace => ({
  prod: Array(24).fill(0), cons: Array(24).fill(0), chSolar: Array(24).fill(0),
  chGrid: Array(24).fill(0), dis: Array(24).fill(0), soc: Array(24).fill(0),
});

// ============================ BATARYA SAĞLIĞI (SOH) ============================

/** Kapasite sağlığı şartı: `year`. yılın sonunda kapasite, ilk kapasitenin en az `pct`'i olmalı. */
export interface SohReq { year: number; pct: number }

export interface SohRow {
  y: number;
  /** Yıl sonu sağlık (ilk kapasiteye oranı, 0..1) */
  soh: number;
  /** Bu yılda kontrol noktası varsa şart (0..1) */
  req?: number;
  ok?: boolean;
}

export interface SohCheck {
  rows: SohRow[];
  /** Tüm kontrol noktaları sağlanıyor mu? */
  ok: boolean;
  /** Yenileme olmadan tüm şartları sağlayan en yüksek yıllık kayıp (0..1) */
  maxDegr: number;
}

/**
 * Yıl sonu sağlık eğrisi: (1 − kayıp)^yaş. Hücre yenilemesi (augYear) sağlığı
 * yeniden %100'e çeker. Şart kontrolü yıl SONU değerine göre yapılır.
 */
export function sohCheck(life: number, degr: number, augYear: number, reqs: SohReq[], over = 1): SohCheck {
  const valid = reqs.filter((r) => r.year > 0 && r.pct > 0);
  const rows: SohRow[] = [];
  for (let y = 1; y <= life; y++) {
    const ageEnd = augYear > 0 && y >= augYear ? y - augYear + 1 : y;
    // Beyan edilen kapasiteye oranla: kapasite fazlası (over) sağlığı yukarı taşır
    const soh = over * Math.pow(1 - degr, ageEnd);
    const r = valid.find((q) => q.year === y);
    rows.push(r ? { y, soh, req: r.pct / 100, ok: soh >= r.pct / 100 - 1e-9 } : { y, soh });
  }
  const checks = rows.filter((r) => r.req !== undefined);
  const maxDegr = valid.length
    ? Math.max(0, Math.min(...valid.map((q) => 1 - Math.pow(Math.min(1, q.pct / 100 / over), 1 / q.year))))
    : 1;
  return { rows, ok: checks.every((r) => r.ok), maxDegr };
}

/** Kullanıcı girdisinden şart listesi (yıl 0 veya % 0 → yok sayılır) */
export function sohReqsOf(i: { sohY1?: number; sohP1?: number; sohY2?: number; sohP2?: number }): SohReq[] {
  return [
    { year: Math.round(i.sohY1 ?? 0), pct: i.sohP1 ?? 0 },
    { year: Math.round(i.sohY2 ?? 0), pct: i.sohP2 ?? 0 },
  ];
}

/** C-oranı seçenekleri (0 = güç elle girilir) */
export const C_RATES: { value: number; label: string }[] = [
  { value: 1, label: '1C — 1 saatlik (güç = kapasite)' },
  { value: 0.5, label: '0,5C — 2 saatlik' },
  { value: 0.25, label: '0,25C — 4 saatlik' },
  { value: 0, label: 'Özel (gücü elle gir)' },
];
