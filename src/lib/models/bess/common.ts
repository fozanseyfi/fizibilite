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
