/**
 * EPDK Saatlik Mahsuplaşma Motoru
 *
 * Yasal dayanak: EPDK Karar No: 14531 (30.04.2026), R.G. 02.04.2026 / 33212,
 * "Lisanssız Elektrik Üretimine İlişkin 1 Nolu Açıklama".
 *
 * Bu motor PRD §3'te tanımlanan algoritmayı uygular ve EPDK Tablo 1/2/3
 * örneklerini birebir geçer (tests/netting.test.ts).
 */

import { HOURS_PER_YEAR, NettingResult, ConsumptionConfig } from './types';

export interface HourlyNettingInput {
  generation: number[]; // 8760, kWh
  consumption: number[]; // 8760, kWh
  prevYearConsumptionKwh: number; // bedelli üretim limiti için
  sameMeteringPoint?: boolean;
  samePointData?: { A: number; B: number; C: number };
}

/**
 * Aynı ölçüm noktasında tüketim formülü: T = A + (B - C)
 * A: çift yönlü sayaç çekiş, B: tek yönlü üretim sayacı veriş, C: çift yönlü sayaç veriş.
 * Toplam yıllık tüketim formülden gelir; saatlik dağılım için orijinal profil korunur.
 */
export function applySameMeteringPointAdjustment(
  consumption: number[],
  samePointData: { A: number; B: number; C: number }
): number[] {
  const { A, B, C } = samePointData;
  const target = A + (B - C);
  const currentTotal = consumption.reduce((acc, v) => acc + v, 0);
  if (currentTotal === 0) return consumption.slice();
  const scale = target / currentTotal;
  return consumption.map((v) => v * scale);
}

/**
 * Saatlik mahsuplaşma — EPDK 1 Nolu Açıklama, Tablo 1-3 birebir.
 *
 * Kurallar:
 * 1. Her saat: netted = min(üretim, tüketim).
 * 2. Net tüketim = max(0, tüketim - üretim) → şebekeden çekilen (alış).
 * 3. Fazla üretim = max(0, üretim - tüketim).
 * 4. Bedelli üretim limiti = önceki yıl tüketim × 2 (YILLIK toplam).
 * 5. YILLIK BEDELLİ (mahsup + paid surplus) ≤ limit.
 *    Aşan tüm üretim YEKDEM'e bedelsiz.
 *    Mahsup limitten muaf değil ama Tablo 3 mantığında:
 *       paid_surplus_annual = min(surplus_annual, limit - netted_annual)
 *       yekdem_annual = surplus_annual - paid_surplus_annual
 *    (Bu sonuç EPDK Tablo 3 örneğini birebir verir: 70 mahsup + 130 satış + 20 YEKDEM = 220 MWh.)
 *    Saatlik paid_surplus ve yekdem_free, surplus[h] ağırlığına göre proporsiyonel dağıtılır.
 */
export function hourlyNetting(input: HourlyNettingInput): NettingResult {
  const { generation, prevYearConsumptionKwh } = input;
  let consumption = input.consumption;

  if (generation.length !== HOURS_PER_YEAR || consumption.length !== HOURS_PER_YEAR) {
    throw new Error(`Üretim ve tüketim dizileri ${HOURS_PER_YEAR} saat içermelidir.`);
  }

  if (input.sameMeteringPoint && input.samePointData) {
    consumption = applySameMeteringPointAdjustment(consumption, input.samePointData);
  }

  const netted = new Array<number>(HOURS_PER_YEAR);
  const netConsumption = new Array<number>(HOURS_PER_YEAR);
  const surplus = new Array<number>(HOURS_PER_YEAR);
  const cumulativeGeneration = new Array<number>(HOURS_PER_YEAR);
  const paidSurplus = new Array<number>(HOURS_PER_YEAR).fill(0);
  const yekdemFree = new Array<number>(HOURS_PER_YEAR).fill(0);

  const paidGenerationLimitKwh = prevYearConsumptionKwh * 2;

  let cumGen = 0;
  let totalNettedRunning = 0;
  let totalSurplusRunning = 0;

  for (let h = 0; h < HOURS_PER_YEAR; h++) {
    const g = generation[h];
    const c = consumption[h];

    const n = Math.min(g, c);
    netted[h] = n;
    netConsumption[h] = Math.max(0, c - g);
    surplus[h] = Math.max(0, g - c);

    cumGen += g;
    cumulativeGeneration[h] = cumGen;
    totalNettedRunning += n;
    totalSurplusRunning += surplus[h];
  }

  // Yıllık limit uygulaması (EPDK Tablo 3)
  const allowedPaidSurplus = Math.max(0, paidGenerationLimitKwh - totalNettedRunning);
  const totalPaidSurplus = Math.min(totalSurplusRunning, allowedPaidSurplus);
  const totalYekdemFree = Math.max(0, totalSurplusRunning - totalPaidSurplus);

  // Saatlik dağıtım: surplus'ı yıllık paid/yekdem oranıyla böl
  const paidShare = totalSurplusRunning > 0 ? totalPaidSurplus / totalSurplusRunning : 0;
  let overLimitStartHour: number | null = null;

  if (totalYekdemFree > 0) {
    // Kümülatif olarak limitin geçildiği ilk saat (raporlama için)
    for (let h = 0; h < HOURS_PER_YEAR; h++) {
      if (cumulativeGeneration[h] > paidGenerationLimitKwh) {
        overLimitStartHour = h;
        break;
      }
    }
  }

  for (let h = 0; h < HOURS_PER_YEAR; h++) {
    const s = surplus[h];
    paidSurplus[h] = s * paidShare;
    yekdemFree[h] = s * (1 - paidShare);
  }

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  const totalGeneration = sum(generation);
  const totalConsumption = sum(consumption);
  const totalNetted = totalNettedRunning;
  const totalNetConsumption = sum(netConsumption);
  const totalSurplus = totalSurplusRunning;

  return {
    netted,
    netConsumption,
    surplusGeneration: surplus,
    paidSurplus,
    yekdemFree,
    cumulativeGeneration,
    paidGenerationLimitKwh,
    overLimitStartHour,
    annual: {
      totalGeneration,
      totalConsumption,
      totalNetted,
      totalNetConsumption,
      totalSurplus,
      totalPaidSurplus,
      totalYekdemFree,
      selfConsumptionRatio: totalGeneration > 0 ? totalNetted / totalGeneration : 0,
      autonomyRatio: totalConsumption > 0 ? totalNetted / totalConsumption : 0,
    },
  };
}

/**
 * Mesken aboneleri için aylık mahsuplaşma (yasa gereği).
 * Kurulu güç farketmez, bedelli üretim limiti yok.
 */
export function monthlyNetting(input: Omit<HourlyNettingInput, 'prevYearConsumptionKwh'>): NettingResult {
  const { generation, consumption } = input;
  if (generation.length !== HOURS_PER_YEAR || consumption.length !== HOURS_PER_YEAR) {
    throw new Error(`Üretim ve tüketim dizileri ${HOURS_PER_YEAR} saat içermelidir.`);
  }

  const monthBoundaries = getMonthBoundaries();
  const netted = new Array<number>(HOURS_PER_YEAR).fill(0);
  const netConsumption = new Array<number>(HOURS_PER_YEAR).fill(0);
  const surplus = new Array<number>(HOURS_PER_YEAR).fill(0);
  const paidSurplus = new Array<number>(HOURS_PER_YEAR).fill(0);
  const yekdemFree = new Array<number>(HOURS_PER_YEAR).fill(0);
  const cumulativeGeneration = new Array<number>(HOURS_PER_YEAR);

  for (let m = 0; m < 12; m++) {
    const [startH, endH] = monthBoundaries[m];
    let monthGen = 0;
    let monthCons = 0;
    for (let h = startH; h < endH; h++) {
      monthGen += generation[h];
      monthCons += consumption[h];
    }
    const monthlyNetted = Math.min(monthGen, monthCons);
    const monthlyNet = Math.max(0, monthCons - monthGen);
    const monthlySurplus = Math.max(0, monthGen - monthCons);

    // Aylık değerleri saatlere proporsiyonel dağıt
    if (monthGen > 0 && monthlyNetted > 0) {
      for (let h = startH; h < endH; h++) {
        netted[h] = (generation[h] / monthGen) * monthlyNetted;
      }
    }
    if (monthlySurplus > 0 && monthGen > 0) {
      for (let h = startH; h < endH; h++) {
        const share = generation[h] / monthGen;
        surplus[h] = share * monthlySurplus;
        paidSurplus[h] = share * monthlySurplus; // mesken'de bedelli limit yok
      }
    }
    if (monthlyNet > 0 && monthCons > 0) {
      for (let h = startH; h < endH; h++) {
        netConsumption[h] = (consumption[h] / monthCons) * monthlyNet;
      }
    }
  }

  let cum = 0;
  for (let h = 0; h < HOURS_PER_YEAR; h++) {
    cum += generation[h];
    cumulativeGeneration[h] = cum;
  }

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  return {
    netted,
    netConsumption,
    surplusGeneration: surplus,
    paidSurplus,
    yekdemFree,
    cumulativeGeneration,
    paidGenerationLimitKwh: Infinity,
    overLimitStartHour: null,
    annual: {
      totalGeneration: sum(generation),
      totalConsumption: sum(consumption),
      totalNetted: sum(netted),
      totalNetConsumption: sum(netConsumption),
      totalSurplus: sum(surplus),
      totalPaidSurplus: sum(paidSurplus),
      totalYekdemFree: 0,
      selfConsumptionRatio: sum(generation) > 0 ? sum(netted) / sum(generation) : 0,
      autonomyRatio: sum(consumption) > 0 ? sum(netted) / sum(consumption) : 0,
    },
  };
}

const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function getMonthBoundaries(): Array<[number, number]> {
  const bounds: Array<[number, number]> = [];
  let cursor = 0;
  for (let m = 0; m < 12; m++) {
    const start = cursor;
    const end = cursor + DAYS_PER_MONTH[m] * 24;
    bounds.push([start, end]);
    cursor = end;
  }
  return bounds;
}
