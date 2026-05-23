/**
 * PTF (Piyasa Takas Fiyatı) saatlik veri yardımcıları.
 *
 * Kaynak: EPİAŞ Şeffaflık Platformu (seffaflik.epias.com.tr)
 * EPİAŞ API açık ama auth gerektirir. Bu modül:
 *   - CSV upload edilirse parse eder (timestamp + ptf_tl)
 *   - Yoksa Türkiye tipik PTF profili (2025 ortalamasından sentetik) döner
 */

import { HOURS_PER_YEAR } from './types';

/**
 * 2025 Türkiye tipik PTF profili (TL/MWh → TL/kWh çevirisi yapılır).
 * Saatlik ortalama (5 zaman dilimi):
 *   00-06 (gece) ortalama: 1.80 TL/kWh
 *   06-10 (sabah pikI):    3.20
 *   10-14 (öğle düşüş):    2.60 (güneş üretimi yüksek)
 *   14-18 (akşam pik):     4.10
 *   18-24 (gece pik):      3.50
 * 2026 enflasyonla *1.25 çarpan uygulanır.
 */
const TYPICAL_PTF_24H_2025 = [
  // 00-06: gece
  1.85, 1.75, 1.70, 1.70, 1.75, 1.85,
  // 06-10: sabah
  2.40, 3.00, 3.40, 3.20,
  // 10-14: gün ortası (solar üretimi PTF'yi aşağı çeker)
  2.80, 2.50, 2.40, 2.60,
  // 14-18: akşam pik
  3.20, 3.80, 4.30, 4.40,
  // 18-22: gece pik
  4.20, 3.80, 3.40, 3.10,
  // 22-24: düşüş
  2.50, 2.10,
];

const INFLATION_2025_TO_2026 = 1.25;
const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHLY_FACTOR = [1.10, 1.08, 1.02, 0.95, 0.92, 0.95, 1.05, 1.08, 1.00, 0.95, 1.05, 1.15]; // kış pik, yaz düşüş

export function generateSyntheticPtf2026(): number[] {
  const hourly = new Array<number>(HOURS_PER_YEAR);
  let cursor = 0;
  for (let m = 0; m < 12; m++) {
    const factor = MONTHLY_FACTOR[m];
    for (let d = 0; d < DAYS_PER_MONTH[m]; d++) {
      for (let h = 0; h < 24; h++) {
        hourly[cursor++] = TYPICAL_PTF_24H_2025[h] * factor * INFLATION_2025_TO_2026;
      }
    }
  }
  return hourly;
}

/**
 * Kullanıcının yüklediği CSV'yi parse eder.
 * Beklenen format (header'lı veya headersız):
 *   - 1. kolon: timestamp (ISO veya DD.MM.YYYY HH:00)
 *   - 2. kolon: PTF (TL/MWh veya TL/kWh — büyüklüğe göre otomatik algılar)
 *
 * 8760 satır beklenir; eksik/fazla varsa hata.
 */
export function parsePtfCsv(text: string): { hourly: number[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Header tespiti
  let startIdx = 0;
  if (/[a-z]/i.test(lines[0].split(/[,;\t]/)[1] ?? '')) startIdx = 1;

  const rows: number[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(/[,;\t]/);
    if (parts.length < 2) continue;
    const v = parseFloat(parts[1].replace(',', '.'));
    if (Number.isFinite(v)) rows.push(v);
  }

  if (rows.length !== HOURS_PER_YEAR) {
    errors.push(`Tam ${HOURS_PER_YEAR} saat bekleniyor, ${rows.length} okundu.`);
    if (rows.length === 0) return { hourly: [], errors };
  }

  // TL/MWh mı TL/kWh mı? Ortalama > 100 ise muhtemelen TL/MWh
  const avg = rows.reduce((a, b) => a + b, 0) / rows.length;
  const scale = avg > 50 ? 1 / 1000 : 1; // MWh→kWh

  return {
    hourly: rows.slice(0, HOURS_PER_YEAR).map((v) => v * scale),
    errors,
  };
}

/** Aylık ortalama PTF (özet) */
export function monthlyAveragePtf(hourly: number[]): number[] {
  const out: number[] = [];
  let cursor = 0;
  for (let m = 0; m < 12; m++) {
    const hours = DAYS_PER_MONTH[m] * 24;
    let s = 0;
    for (let h = cursor; h < cursor + hours; h++) s += hourly[h] || 0;
    out.push(s / hours);
    cursor += hours;
  }
  return out;
}
