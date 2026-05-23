/**
 * Wizard'daki consumption builder UI'sından üretilen 8760 saatlik tüketim profili.
 *
 * Girdiler:
 *   - Günlük dağılım (5 dilim × 24 saat): 00-06, 06-10, 10-14, 14-18, 18-00
 *     - Her dilimin yüzdesi (toplam 100)
 *   - Aylık dağılım (12 ay): yüzde olarak, toplam 100
 *   - Hafta sonu çarpanı (örn. 0.5 = hafta sonu hafta içinin yarısı)
 *
 * Çıktı: 8760 elemanlı number[] dizisi (yıllık toplam = annualKwh).
 */

import { HOURS_PER_YEAR } from './types';

export interface DailyDistribution {
  /** 5 dilim toplam = 100 (%) */
  slot_00_06: number;
  slot_06_10: number;
  slot_10_14: number;
  slot_14_18: number;
  slot_18_24: number;
}

export interface MonthlyDistribution {
  /** 12 ay toplam = 100 (%) */
  months: number[]; // length 12
}

export interface ConsumptionBuilderInput {
  annualKwh: number;
  daily: DailyDistribution;
  monthly: MonthlyDistribution;
  weekendFactor: number; // 1.0 = hafta sonu hafta içi ile aynı, 0.5 = yarısı
}

const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const DEFAULT_DAILY_CONSTANT: DailyDistribution = {
  slot_00_06: 20,
  slot_06_10: 20,
  slot_10_14: 20,
  slot_14_18: 20,
  slot_18_24: 20,
};

export const DEFAULT_DAILY_OFFICE: DailyDistribution = {
  slot_00_06: 5,
  slot_06_10: 20,
  slot_10_14: 30,
  slot_14_18: 30,
  slot_18_24: 15,
};

export const DEFAULT_DAILY_HOTEL: DailyDistribution = {
  slot_00_06: 15,
  slot_06_10: 18,
  slot_10_14: 18,
  slot_14_18: 18,
  slot_18_24: 31,
};

export const DEFAULT_DAILY_FACTORY_2SHIFT: DailyDistribution = {
  slot_00_06: 5,
  slot_06_10: 25,
  slot_10_14: 25,
  slot_14_18: 25,
  slot_18_24: 20,
};

export const DEFAULT_MONTHLY_EQUAL: MonthlyDistribution = {
  months: Array(12).fill(100 / 12),
};

/** Soğuk hava deposu: yaz daha yüksek */
export const DEFAULT_MONTHLY_COLD_STORAGE: MonthlyDistribution = {
  months: [6, 6, 7, 8, 9, 11, 12, 12, 10, 7, 6, 6],
};

/** Tipik sektörel yıllık dağılım — TÜFE-bazlı tüketim */
export const DEFAULT_MONTHLY_BUSINESS: MonthlyDistribution = {
  months: [9, 8, 9, 8, 8, 9, 9, 9, 9, 8, 8, 8],
};

export function buildHourlyFromBuilder(input: ConsumptionBuilderInput): number[] {
  const { annualKwh, daily, monthly, weekendFactor } = input;
  validateDistribution(daily);
  validateMonthly(monthly);

  // 1. Saatlik dilim ağırlığı (5 dilim) → her saatin payı
  const hourlyWeights = new Array<number>(24).fill(0);
  const slotMap: Array<[number, number, number]> = [
    [0, 6, daily.slot_00_06 / 6],
    [6, 10, daily.slot_06_10 / 4],
    [10, 14, daily.slot_10_14 / 4],
    [14, 18, daily.slot_14_18 / 4],
    [18, 24, daily.slot_18_24 / 6],
  ];
  for (const [start, end, perHourPct] of slotMap) {
    for (let h = start; h < end; h++) hourlyWeights[h] = perHourPct;
  }
  // Şu an: yüzde olarak günün toplamı 100 → fraction'a çevir
  const dailyTotal = hourlyWeights.reduce((a, b) => a + b, 0);
  if (dailyTotal === 0) throw new Error('Günlük dağılım toplamı 0');
  const dailyShare = hourlyWeights.map((w) => w / dailyTotal);

  // 2. Aylık ağırlıkları normalize et
  const monthlyTotal = monthly.months.reduce((a, b) => a + b, 0);
  const monthlyShare = monthly.months.map((m) => m / monthlyTotal);

  // 3. Hafta içi/hafta sonu sayısı (basitleştirilmiş: 5/2 oranı)
  // Her gün için hafta sonu mu kontrolü için tarih hesabı yapalım
  const weekendFlags = computeWeekendFlags();

  // 4. 8760 saatlik dizi
  const result = new Array<number>(HOURS_PER_YEAR);
  let cursor = 0;
  for (let m = 0; m < 12; m++) {
    const days = DAYS_PER_MONTH[m];
    const monthAnnualShare = monthlyShare[m] * annualKwh;
    // Bu ayda hafta içi ve hafta sonu gün sayıları
    let weekdayCount = 0, weekendCount = 0;
    for (let d = 0; d < days; d++) {
      const dayOfYear = dayOfYearFromMonthDay(m, d);
      if (weekendFlags[dayOfYear]) weekendCount++; else weekdayCount++;
    }
    // weekendFactor: hafta sonu hafta içinin "weekendFactor" katı
    // total = weekdayCount × X + weekendCount × (X × weekendFactor) = monthAnnualShare
    // X = monthAnnualShare / (weekdayCount + weekendCount × weekendFactor)
    const dayBase = monthAnnualShare / (weekdayCount + weekendCount * weekendFactor);

    for (let d = 0; d < days; d++) {
      const dayOfYear = dayOfYearFromMonthDay(m, d);
      const dayKwh = weekendFlags[dayOfYear] ? dayBase * weekendFactor : dayBase;
      for (let h = 0; h < 24; h++) {
        result[cursor] = dayKwh * dailyShare[h];
        cursor++;
      }
    }
  }
  return result;
}

function validateDistribution(d: DailyDistribution): void {
  const sum = d.slot_00_06 + d.slot_06_10 + d.slot_10_14 + d.slot_14_18 + d.slot_18_24;
  if (Math.abs(sum - 100) > 0.5) {
    throw new Error(`Günlük dilim yüzdeleri toplamı 100 olmalı (verilen: ${sum.toFixed(1)}).`);
  }
}

function validateMonthly(m: MonthlyDistribution): void {
  if (m.months.length !== 12) throw new Error('Aylık dağılım tam 12 değer olmalı.');
  const sum = m.months.reduce((a, b) => a + b, 0);
  if (sum === 0) throw new Error('Aylık dağılım toplamı 0 olamaz.');
}

function computeWeekendFlags(dayOfWeekJan1 = 4): boolean[] {
  const flags = new Array<boolean>(365);
  for (let d = 0; d < 365; d++) {
    const dow = (dayOfWeekJan1 + d) % 7; // 0=Pazartesi
    flags[d] = dow === 5 || dow === 6;
  }
  return flags;
}

function dayOfYearFromMonthDay(monthIdx: number, dayIdx: number): number {
  let doy = 0;
  for (let m = 0; m < monthIdx; m++) doy += DAYS_PER_MONTH[m];
  return doy + dayIdx;
}

/** Aylık toplam (12 ay) — saatlik diziden */
export function monthlyTotalsFromHourly(hourly: number[]): number[] {
  const out = new Array<number>(12).fill(0);
  let cursor = 0;
  for (let m = 0; m < 12; m++) {
    const end = cursor + DAYS_PER_MONTH[m] * 24;
    for (let h = cursor; h < end; h++) out[m] += hourly[h] || 0;
    cursor = end;
  }
  return out;
}
