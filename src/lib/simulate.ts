/**
 * Simulation Orchestrator — bütün motorları sıralı çalıştırır.
 *
 * 1. PVGIS'ten 8760 saatlik üretim (cache'li) veya override
 * 2. Tüketim profili → 8760 saat
 * 3. N yıllık degradasyon + büyüme projeksiyonu
 * 4. Saatlik mahsuplaşma motoru (her yıl için)
 * 5. Batarya dispatch (her yıl için, dejenerasyon ile)
 * 6. Finans (yıllık) — IRR/NPV/LCOE
 * 7. Opsiyonel Monte Carlo
 */

import {
  ProjectConfig,
  NettingResult,
  BatteryDispatchResult,
  SimulationResult,
  HOURS_PER_YEAR,
} from './types';
import { fetchPVGIS, applyDegradation } from './pvgis';
import { expandProfile, projectConsumption } from './consumption';
import { buildHourlyFromBuilder } from './consumption-builder';
import { hourlyNetting, monthlyNetting } from './netting';
import { dispatchBattery, batteryEffectiveCapacity } from './battery';
import { computeFinance } from './finance';
import { runMonteCarlo } from './monte-carlo';

export async function runFullSimulation(config: ProjectConfig): Promise<SimulationResult> {
  const t0 = Date.now();

  // 1. Üretim (8760)
  let baseGeneration: number[];
  if (config.generationOverride && config.generationOverride.length === HOURS_PER_YEAR) {
    baseGeneration = config.generationOverride.slice();
  } else {
    const pvgisResult = await fetchPVGIS({ location: config.location, pv: config.pv });
    baseGeneration = pvgisResult.hourly;
  }

  // 2. Tüketim — builder veya profil veya CSV
  let baseConsumption: number[];
  if (config.consumption.hourly && config.consumption.hourly.length === HOURS_PER_YEAR) {
    baseConsumption = config.consumption.hourly.slice();
  } else if (config.consumption.profileId === 'custom_builder' && config.consumption.builder) {
    const b = config.consumption.builder;
    baseConsumption = buildHourlyFromBuilder({
      annualKwh: config.consumption.annualKwh,
      daily: b.daily,
      monthly: { months: b.monthly },
      weekendFactor: b.weekendFactor,
    });
  } else {
    baseConsumption = expandProfile(config.consumption.profileId, config.consumption.annualKwh);
  }

  // 3. N yıllık projeksiyon
  const years = config.analysisYears;
  const generationByYear: number[][] = [];
  for (let y = 0; y < years; y++) {
    generationByYear.push(applyDegradation(baseGeneration, config.pv, y));
  }
  const consumptionByYearMatrix = projectConsumptionFromBase(baseConsumption, config.consumption.growthRatePct, years);

  // 4. Mahsuplaşma
  const isMesken = config.tariff.consumerGroup === 'MESKEN';
  const nettingByYear: NettingResult[] = [];
  for (let y = 0; y < years; y++) {
    const g = generationByYear[y];
    const c = consumptionByYearMatrix[y];
    const prevYearKwh = y === 0
      ? config.consumption.prevYearKwh
      : consumptionByYearMatrix[y - 1].reduce((a, b) => a + b, 0);
    const result = isMesken
      ? monthlyNetting({ generation: g, consumption: c })
      : hourlyNetting({
          generation: g,
          consumption: c,
          prevYearConsumptionKwh: prevYearKwh,
          sameMeteringPoint: config.consumption.sameMeteringPoint,
          samePointData: config.consumption.samePointData,
        });
    nettingByYear.push(result);
  }

  // 5. Batarya
  const batteryByYear: BatteryDispatchResult[] = [];
  let cumulativeCycles = 0;
  for (let y = 0; y < years; y++) {
    const effectiveCapacityKwh = config.battery.enabled
      ? batteryEffectiveCapacity(config.battery, y, cumulativeCycles)
      : 0;
    const dispatch = dispatchBattery({
      generation: generationByYear[y],
      consumption: consumptionByYearMatrix[y],
      config: config.battery,
      prevYearConsumptionKwh:
        y === 0 ? config.consumption.prevYearKwh : consumptionByYearMatrix[y - 1].reduce((a, b) => a + b, 0),
      effectiveCapacityKwh,
      hourlyPtfTlKwh: config.ptfHourly,
    });
    cumulativeCycles += dispatch.cycles;
    batteryByYear.push(dispatch);
  }

  // 6. Finans
  const finance = computeFinance({
    config,
    nettingByYear,
    batteryByYear,
    generationByYear,
    consumptionByYear: consumptionByYearMatrix,
  });

  // 7. Monte Carlo
  let monteCarlo;
  if (config.monteCarlo.enabled) {
    const baseGenerationAnnual = generationByYear.map((arr) => arr.reduce((a, b) => a + b, 0));
    const baseConsumptionAnnual = consumptionByYearMatrix.map((arr) => arr.reduce((a, b) => a + b, 0));
    monteCarlo = runMonteCarlo({
      config,
      baseNetting: nettingByYear,
      baseBattery: batteryByYear,
      baseGenerationAnnual,
      baseConsumptionAnnual,
      baseTotalCapexTl: finance.totalCapexTl,
      baseLoanPrincipal0: 0,
    });
  }

  return {
    generationByYear,
    consumptionByYear: consumptionByYearMatrix,
    nettingByYear,
    batteryByYear,
    finance,
    monteCarlo,
    computedAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
  };
}

function projectConsumptionFromBase(baseHourly: number[], growthRatePct: number, years: number): number[][] {
  const result: number[][] = [];
  for (let y = 0; y < years; y++) {
    const scale = Math.pow(1 + growthRatePct / 100, y);
    result.push(baseHourly.map((v) => v * scale));
  }
  return result;
}
