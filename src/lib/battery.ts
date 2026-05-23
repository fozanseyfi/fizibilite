/**
 * Batarya (BESS) Modeli — PRD §6.
 *
 * Kural-tabanlı dispatch (forward sweep, O(N) — 8760 saat < 50ms).
 *
 * Karar ağacı (öncelik sırasına göre):
 *   1. Öz tüketim: fazla üretim → batarya, açık tüketim → bataryadan
 *   2. Bedelli limit koruması: limit yaklaşırsa fazla üretimi bataryaya zorla
 *   3. Peak shaving: peak threshold aşılırsa boşalt
 *   4. PTF arbitrajı: ucuz saatte yükle, pahalı saatte boşalt (limit altıysa)
 *
 * Yasal kısıt: Sadece GES-only charge satışa konu olabilir.
 * Bu yüzden `charge` (GES'ten) ve `gridCharge` (şebekeden) ayrı izlenir.
 */

import { HOURS_PER_YEAR, BatteryConfig, BatteryDispatchResult } from './types';

export interface BatteryDispatchInput {
  generation: number[]; // 8760
  consumption: number[]; // 8760
  config: BatteryConfig;
  prevYearConsumptionKwh: number;
  hourlyPtfTlKwh?: number[]; // arbitraj için, opsiyonel
  effectiveCapacityKwh?: number; // dejenerasyon sonrası kapasite, default nominal
}

export function dispatchBattery(input: BatteryDispatchInput): BatteryDispatchResult {
  const { generation, consumption, config, prevYearConsumptionKwh } = input;
  if (generation.length !== HOURS_PER_YEAR || consumption.length !== HOURS_PER_YEAR) {
    throw new Error(`Üretim ve tüketim ${HOURS_PER_YEAR} saat olmalı.`);
  }
  if (!config.enabled) {
    return emptyDispatch(generation, consumption);
  }

  const effectiveCapacityKwh = input.effectiveCapacityKwh ?? config.nominalCapacityKwh;
  const minSocKwh = effectiveCapacityKwh * config.minSocPct;
  const maxSocKwh = effectiveCapacityKwh * config.maxSocPct;
  const usableCapacity = maxSocKwh - minSocKwh;
  const sqrtEff = Math.sqrt(config.roundTripEfficiency);
  const powerLimit = config.nominalPowerKw; // her saatte ≤ powerLimit kWh

  const paidLimit = prevYearConsumptionKwh * 2;

  let soc = effectiveCapacityKwh * config.initialSocPct;
  let cumGen = 0;
  let cycledEnergy = 0;

  const socArr = new Array<number>(HOURS_PER_YEAR);
  const charge = new Array<number>(HOURS_PER_YEAR).fill(0);
  const gridCharge = new Array<number>(HOURS_PER_YEAR).fill(0);
  const discharge = new Array<number>(HOURS_PER_YEAR).fill(0);
  const generationAfter = new Array<number>(HOURS_PER_YEAR);
  const consumptionAfter = new Array<number>(HOURS_PER_YEAR);

  for (let h = 0; h < HOURS_PER_YEAR; h++) {
    let g = generation[h];
    let c = consumption[h];
    cumGen += generation[h];

    // ---- Öncelik 1: ÖZ TÜKETİM ----
    if (g > c) {
      // Fazla üretim → batarya
      const surplus = g - c;
      const canCharge = Math.max(0, maxSocKwh - soc);
      const acceptable = Math.min(surplus, canCharge / sqrtEff, powerLimit);
      const storedAfterEff = acceptable * sqrtEff;
      soc += storedAfterEff;
      charge[h] += acceptable;
      g -= acceptable;
      cycledEnergy += storedAfterEff;
    } else if (c > g) {
      // Açık tüketim → bataryadan
      const need = c - g;
      const available = Math.max(0, soc - minSocKwh);
      const supply = Math.min(need / sqrtEff, available, powerLimit);
      const deliveredAfterEff = supply * sqrtEff;
      soc -= supply;
      discharge[h] += deliveredAfterEff;
      c -= deliveredAfterEff;
    }

    // ---- Öncelik 2: BEDELLİ LİMİT KORUMASI ----
    // Eğer cumGen + kalan saatlerin projeksiyonu limit aşacaksa, fazla üretim olduğu
    // saatlerde bataryayı zorla doldur (basit yaklaşım: cumGen yaklaşırsa zorla)
    if (cumGen > paidLimit * 0.9 && g > 0) {
      const remainingSurplus = g;
      const canCharge = Math.max(0, maxSocKwh - soc);
      const force = Math.min(remainingSurplus, canCharge / sqrtEff, powerLimit - charge[h]);
      if (force > 0) {
        const stored = force * sqrtEff;
        soc += stored;
        charge[h] += force;
        g -= force;
        cycledEnergy += stored;
      }
    }

    // ---- Öncelik 4: PTF ARBİTRAJI ----
    if (config.enableArbitrage && input.hourlyPtfTlKwh) {
      const ptf = input.hourlyPtfTlKwh[h];
      const remainingPower = powerLimit - charge[h] - discharge[h];
      if (ptf < config.arbitrageLowThresholdTlKwh && remainingPower > 0) {
        const canCharge = Math.max(0, maxSocKwh - soc);
        const gridIn = Math.min(remainingPower, canCharge / sqrtEff);
        if (gridIn > 0) {
          const stored = gridIn * sqrtEff;
          soc += stored;
          gridCharge[h] += gridIn;
          c += gridIn; // şebeke alımı olarak görünür
          cycledEnergy += stored;
        }
      } else if (ptf > config.arbitrageHighThresholdTlKwh && cumGen < paidLimit && remainingPower > 0) {
        const available = Math.max(0, soc - minSocKwh);
        const out = Math.min(remainingPower, available);
        if (out > 0) {
          const delivered = out * sqrtEff;
          soc -= out;
          discharge[h] += delivered;
        }
      }
    }

    socArr[h] = soc / effectiveCapacityKwh;
    generationAfter[h] = generation[h] - charge[h];
    consumptionAfter[h] = consumption[h] - discharge[h] + gridCharge[h];
  }

  const cycles = usableCapacity > 0 ? cycledEnergy / usableCapacity : 0;

  return {
    soc: socArr,
    charge,
    gridCharge,
    discharge,
    cycles,
    effectiveCapacityKwh,
    generationAfterBattery: generationAfter,
    consumptionAfterBattery: consumptionAfter,
  };
}

/**
 * Yıllık efektif batarya kapasitesi (calendar + cycle dejenerasyon).
 */
export function batteryEffectiveCapacity(
  config: BatteryConfig,
  yearIndex: number,
  cumulativeCycles: number
): number {
  if (!config.enabled) return 0;
  const calendarLoss = Math.min(1, (yearIndex / config.calendarLifeYears) * (1 - config.eolCapacityPct));
  const cycleLoss = Math.min(1, (cumulativeCycles / config.cycleLifeAt80Dod) * (1 - config.eolCapacityPct));
  const totalLossFactor = (1 - calendarLoss) * (1 - cycleLoss);
  let baseCapacity = config.nominalCapacityKwh;

  // Augmentation eklemeleri
  if (config.augmentationEnabled) {
    for (const augYear of config.augmentationYears) {
      if (yearIndex + 1 >= augYear) {
        baseCapacity += config.augmentationKwhPerEvent;
      }
    }
  }

  return baseCapacity * totalLossFactor;
}

function emptyDispatch(generation: number[], consumption: number[]): BatteryDispatchResult {
  return {
    soc: new Array<number>(HOURS_PER_YEAR).fill(0),
    charge: new Array<number>(HOURS_PER_YEAR).fill(0),
    gridCharge: new Array<number>(HOURS_PER_YEAR).fill(0),
    discharge: new Array<number>(HOURS_PER_YEAR).fill(0),
    cycles: 0,
    effectiveCapacityKwh: 0,
    generationAfterBattery: generation.slice(),
    consumptionAfterBattery: consumption.slice(),
  };
}
