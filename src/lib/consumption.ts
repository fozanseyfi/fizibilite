/**
 * Tüketim Profili Motoru — PRD §5.
 *
 * 14 sektörel TMY (Typical Meteorological/Operational Year) profili.
 * Her profil saatlik ağırlık matrisi olarak modellenir:
 *   weights[month][hour_of_day_local][weekday_flag] → relatif çekim
 *
 * Bir yıllık 8760 saate dağıtım için profilin ağırlıkları normalize edilir
 * (toplam = 1.0) ve `annualKwh × normalizedWeight[h]` ile saatlik kWh elde edilir.
 */

import { HOURS_PER_YEAR, ConsumptionProfileMeta } from './types';

export interface ProfileDefinition extends ConsumptionProfileMeta {
  /** 24 saatlik tipik gün profili — hafta içi */
  weekdayHourly: number[];
  /** 24 saatlik tipik gün profili — hafta sonu */
  weekendHourly: number[];
  /** 12 aylık mevsimsellik (ağırlık, ortalama 1.0) */
  monthly: number[];
}

const flat24 = (vals: number[]): number[] => {
  if (vals.length !== 24) throw new Error('24 saatlik profil olmalı');
  return vals;
};

const flat12 = (vals: number[]): number[] => {
  if (vals.length !== 12) throw new Error('12 aylık profil olmalı');
  return vals;
};

export const PROFILES: Record<string, ProfileDefinition> = {
  office_5x8: {
    id: 'office_5x8',
    label: 'Ofis 5×8 (09-18)',
    peakHours: '10-12, 14-17',
    category: 'office',
    weekdayHourly: flat24([
      0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.3, 0.6, 0.9, 1.0, 1.0, 1.0,
      0.7, 0.95, 1.0, 1.0, 0.95, 0.7, 0.4, 0.2, 0.15, 0.1, 0.1, 0.1,
    ]),
    weekendHourly: flat24(new Array(24).fill(0.1)),
    monthly: flat12([1.05, 1.02, 1.0, 0.95, 0.95, 1.05, 1.15, 1.15, 1.0, 0.95, 1.0, 1.05]),
  },
  office_5x10: {
    id: 'office_5x10',
    label: 'Ofis 5×10 genişletilmiş',
    peakHours: '09-19',
    category: 'office',
    weekdayHourly: flat24([
      0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.3, 0.7, 1.0, 1.0, 1.0, 1.0,
      0.8, 1.0, 1.0, 1.0, 1.0, 0.9, 0.7, 0.4, 0.2, 0.15, 0.1, 0.1,
    ]),
    weekendHourly: flat24(new Array(24).fill(0.15)),
    monthly: flat12([1.05, 1.02, 1.0, 0.95, 0.95, 1.05, 1.15, 1.15, 1.0, 0.95, 1.0, 1.05]),
  },
  retail_7x12: {
    id: 'retail_7x12',
    label: 'Perakende / Mağaza 7×12',
    peakHours: '11-21',
    category: 'retail',
    weekdayHourly: flat24([
      0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.25, 0.4, 0.55, 0.7, 0.9, 1.0,
      1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.6, 0.3, 0.15,
    ]),
    weekendHourly: flat24([
      0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.25, 0.4, 0.6, 0.8, 1.0, 1.1,
      1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.0, 0.9, 0.6, 0.3, 0.15,
    ]),
    monthly: flat12([0.95, 0.9, 0.95, 1.0, 1.0, 1.05, 1.1, 1.1, 1.05, 1.0, 1.0, 1.05]),
  },
  mall: {
    id: 'mall',
    label: 'AVM',
    peakHours: '12-22',
    category: 'retail',
    weekdayHourly: flat24([
      0.2, 0.2, 0.2, 0.2, 0.2, 0.25, 0.3, 0.4, 0.5, 0.65, 0.8, 0.95,
      1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.85, 0.5, 0.3, 0.2,
    ]),
    weekendHourly: flat24([
      0.2, 0.2, 0.2, 0.2, 0.2, 0.25, 0.3, 0.45, 0.6, 0.8, 1.0, 1.1,
      1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.05, 1.0, 0.9, 0.5, 0.3, 0.2,
    ]),
    monthly: flat12([0.95, 0.9, 0.95, 1.0, 1.0, 1.05, 1.15, 1.15, 1.05, 1.0, 1.0, 1.0]),
  },
  hotel: {
    id: 'hotel',
    label: 'Otel (24/7 baz + akşam pik)',
    peakHours: 'gece + akşam',
    category: 'retail',
    weekdayHourly: flat24([
      0.5, 0.45, 0.4, 0.4, 0.4, 0.45, 0.55, 0.7, 0.75, 0.7, 0.65, 0.65,
      0.7, 0.7, 0.65, 0.7, 0.75, 0.85, 1.0, 1.0, 0.95, 0.85, 0.7, 0.55,
    ]),
    weekendHourly: flat24([
      0.5, 0.45, 0.4, 0.4, 0.4, 0.45, 0.55, 0.7, 0.75, 0.7, 0.65, 0.65,
      0.7, 0.7, 0.65, 0.7, 0.75, 0.85, 1.0, 1.0, 0.95, 0.85, 0.7, 0.55,
    ]),
    monthly: flat12([0.9, 0.85, 0.9, 0.95, 1.0, 1.1, 1.2, 1.2, 1.05, 0.95, 0.9, 1.0]),
  },
  restaurant: {
    id: 'restaurant',
    label: 'Restoran',
    peakHours: '12-14, 19-22',
    category: 'retail',
    weekdayHourly: flat24([
      0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.2, 0.3, 0.4, 0.45, 0.6, 0.95,
      1.0, 0.9, 0.5, 0.4, 0.5, 0.7, 0.95, 1.0, 1.0, 0.85, 0.5, 0.2,
    ]),
    weekendHourly: flat24([
      0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.7, 1.0,
      1.05, 0.95, 0.55, 0.45, 0.55, 0.75, 1.0, 1.1, 1.05, 0.9, 0.55, 0.2,
    ]),
    monthly: flat12([0.95, 0.9, 0.95, 1.0, 1.05, 1.1, 1.1, 1.1, 1.05, 1.0, 0.95, 0.95]),
  },
  factory_1shift: {
    id: 'factory_1shift',
    label: 'Fabrika — 1 vardiya',
    peakHours: '08-18',
    category: 'industry',
    weekdayHourly: flat24([
      0.15, 0.15, 0.15, 0.15, 0.15, 0.2, 0.5, 0.9, 1.0, 1.0, 1.0, 0.95,
      0.7, 0.95, 1.0, 1.0, 1.0, 0.95, 0.5, 0.2, 0.15, 0.15, 0.15, 0.15,
    ]),
    weekendHourly: flat24(new Array(24).fill(0.15)),
    monthly: flat12([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 1.0, 1.05, 1.05, 1.05]),
  },
  factory_2shift: {
    id: 'factory_2shift',
    label: 'Fabrika — 2 vardiya',
    peakHours: '06-22',
    category: 'industry',
    weekdayHourly: flat24([
      0.2, 0.2, 0.2, 0.2, 0.2, 0.4, 0.9, 1.0, 1.0, 1.0, 1.0, 0.95,
      0.7, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.7, 0.4, 0.25,
    ]),
    weekendHourly: flat24(new Array(24).fill(0.2)),
    monthly: flat12([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 1.0, 1.05, 1.05, 1.05]),
  },
  factory_3shift: {
    id: 'factory_3shift',
    label: 'Fabrika — 3 vardiya (24/7)',
    peakHours: 'sabit yüksek',
    category: 'industry',
    weekdayHourly: flat24(new Array(24).fill(1.0)),
    weekendHourly: flat24(new Array(24).fill(0.9)),
    monthly: flat12([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 1.0, 1.0, 1.0, 1.0]),
  },
  cold_storage: {
    id: 'cold_storage',
    label: 'Soğuk Hava Deposu',
    peakHours: 'gece daha yüksek',
    category: 'industry',
    weekdayHourly: flat24([
      1.05, 1.05, 1.05, 1.05, 1.0, 1.0, 0.95, 0.9, 0.9, 0.85, 0.85, 0.85,
      0.85, 0.85, 0.85, 0.9, 0.95, 1.0, 1.0, 1.05, 1.05, 1.05, 1.05, 1.05,
    ]),
    weekendHourly: flat24([
      1.05, 1.05, 1.05, 1.05, 1.0, 1.0, 0.95, 0.9, 0.9, 0.85, 0.85, 0.85,
      0.85, 0.85, 0.85, 0.9, 0.95, 1.0, 1.0, 1.05, 1.05, 1.05, 1.05, 1.05,
    ]),
    monthly: flat12([0.8, 0.8, 0.85, 0.95, 1.05, 1.2, 1.3, 1.3, 1.15, 0.95, 0.85, 0.8]),
  },
  data_center: {
    id: 'data_center',
    label: 'Veri Merkezi',
    peakHours: 'sabit',
    category: 'industry',
    weekdayHourly: flat24(new Array(24).fill(1.0)),
    weekendHourly: flat24(new Array(24).fill(1.0)),
    monthly: flat12([0.95, 0.95, 0.95, 1.0, 1.05, 1.1, 1.1, 1.1, 1.05, 1.0, 0.95, 0.95]),
  },
  school: {
    id: 'school',
    label: 'Okul',
    peakHours: '08-16, hafta sonu/yaz düşük',
    category: 'public',
    weekdayHourly: flat24([
      0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.3, 0.7, 1.0, 1.0, 1.0, 0.9,
      0.7, 0.95, 1.0, 1.0, 0.7, 0.3, 0.15, 0.15, 0.1, 0.1, 0.1, 0.1,
    ]),
    weekendHourly: flat24(new Array(24).fill(0.1)),
    monthly: flat12([1.05, 1.05, 1.05, 1.0, 0.95, 0.4, 0.2, 0.2, 0.85, 1.05, 1.05, 1.0]),
  },
  hospital: {
    id: 'hospital',
    label: 'Hastane',
    peakHours: 'sabit yüksek',
    category: 'public',
    weekdayHourly: flat24([
      0.7, 0.7, 0.7, 0.7, 0.7, 0.75, 0.85, 0.95, 1.0, 1.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7,
    ]),
    weekendHourly: flat24([
      0.7, 0.7, 0.7, 0.7, 0.7, 0.75, 0.85, 0.95, 1.0, 1.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7,
    ]),
    monthly: flat12([1.0, 1.0, 1.0, 1.0, 1.0, 1.05, 1.1, 1.1, 1.0, 1.0, 1.0, 1.0]),
  },
  agriculture_irrigation: {
    id: 'agriculture_irrigation',
    label: 'Tarımsal Sulama',
    peakHours: 'yaz mevsimsel',
    category: 'agriculture',
    weekdayHourly: flat24([
      0.05, 0.05, 0.05, 0.05, 0.5, 0.9, 1.0, 1.0, 0.9, 0.7, 0.5, 0.3,
      0.3, 0.5, 0.7, 0.9, 1.0, 1.0, 0.9, 0.6, 0.2, 0.05, 0.05, 0.05,
    ]),
    weekendHourly: flat24([
      0.05, 0.05, 0.05, 0.05, 0.5, 0.9, 1.0, 1.0, 0.9, 0.7, 0.5, 0.3,
      0.3, 0.5, 0.7, 0.9, 1.0, 1.0, 0.9, 0.6, 0.2, 0.05, 0.05, 0.05,
    ]),
    monthly: flat12([0.1, 0.1, 0.2, 0.5, 1.2, 1.8, 2.0, 2.0, 1.5, 0.7, 0.2, 0.1]),
  },
};

const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * 2025/2026 non-leap year baz alınarak: 1 Ocak Perşembe.
 * Saatin yıl içindeki indeksi → hafta içi/hafta sonu/ay belirler.
 */
function isWeekendHour(hourOfYear: number, dayOfWeekJan1 = 4): boolean {
  const dayOfYear = Math.floor(hourOfYear / 24);
  const dow = (dayOfWeekJan1 + dayOfYear) % 7; // 0=Pazartesi, 6=Pazar (basit model)
  return dow === 5 || dow === 6; // Cumartesi, Pazar
}

function monthOfHour(hourOfYear: number): number {
  let cursor = 0;
  for (let m = 0; m < 12; m++) {
    const end = cursor + DAYS_PER_MONTH[m] * 24;
    if (hourOfYear < end) return m;
    cursor = end;
  }
  return 11;
}

/**
 * Profil + yıllık toplam → 8760 saatlik tüketim dizisi (kWh).
 * Profil ağırlıkları toplamı `annualKwh`'e ölçeklenir.
 */
export function expandProfile(profileId: string, annualKwh: number): number[] {
  const profile = PROFILES[profileId];
  if (!profile) throw new Error(`Bilinmeyen profil: ${profileId}`);

  const raw = new Array<number>(HOURS_PER_YEAR);
  for (let h = 0; h < HOURS_PER_YEAR; h++) {
    const hod = h % 24;
    const month = monthOfHour(h);
    const isWeekend = isWeekendHour(h);
    const dailyWeight = isWeekend ? profile.weekendHourly[hod] : profile.weekdayHourly[hod];
    const monthlyWeight = profile.monthly[month];
    raw[h] = dailyWeight * monthlyWeight;
  }

  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum === 0) return raw;
  const scale = annualKwh / sum;
  return raw.map((v) => v * scale);
}

/**
 * Yıllık büyüme oranı uygulanarak N yıllık tüketim dizisi türetir.
 * Her yıl ana profil korunur, yalnızca toplam ölçeklenir.
 */
export function projectConsumption(
  baseProfileId: string,
  baseAnnualKwh: number,
  years: number,
  growthRatePct: number
): number[][] {
  const result: number[][] = [];
  for (let y = 0; y < years; y++) {
    const annualKwh = baseAnnualKwh * Math.pow(1 + growthRatePct / 100, y);
    result.push(expandProfile(baseProfileId, annualKwh));
  }
  return result;
}

/**
 * CSV upload'tan gelen saatlik tüketim verisini doğrular ve normalize eder.
 */
export function validateHourlyConsumption(values: number[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (values.length !== HOURS_PER_YEAR) {
    errors.push(`Tam ${HOURS_PER_YEAR} saatlik veri gereklidir (alınan: ${values.length}).`);
  }
  if (values.some((v) => v < 0)) {
    errors.push('Negatif tüketim değeri olamaz.');
  }
  if (values.every((v) => v === 0)) {
    errors.push('Tüm değerler sıfır.');
  }
  return { valid: errors.length === 0, errors };
}

export const PROFILE_LIST: ConsumptionProfileMeta[] = Object.values(PROFILES).map((p) => ({
  id: p.id,
  label: p.label,
  peakHours: p.peakHours,
  category: p.category,
}));
