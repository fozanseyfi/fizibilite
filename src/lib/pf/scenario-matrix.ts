/**
 * MODÜL 6 — Senaryo Matrisi (150 senaryo)
 *
 * Boyutlar:
 *   1. DC/AC ratio: [1.0, 1.1, 1.2, 1.3, 1.4]  (5)
 *   2. Konfigürasyon: [fixed_mono, fixed_bifacial, tracker_mono, tracker_bifacial, tilted_mono, tilted_bifacial]  (6)
 *   3. Batarya boyutu: [0%, 25%, 50%, 75%, 100% günlük üretim]  (5)
 *
 * Toplam: 5 × 6 × 5 = 150 senaryo
 *
 * Optimizasyon: PVGIS sonucu base konfigürasyon için 1 kez alınır, diğer kombinasyonlar
 * vektörize çarpanlarla türetilir (STRUCTURE_YIELD_FACTOR). Tam simülasyon yerine
 * hızlı analitik tahmin yapılır.
 */

import {
  ScenarioPoint,
  StructureType,
  STRUCTURE_YIELD_FACTOR,
  DC_AC_VALUES,
  STRUCTURE_VALUES,
  BATTERY_RATIOS,
} from './types';
import { ProjectConfig, SimulationResult } from '../types';

export interface ScenarioMatrixInput {
  baseConfig: ProjectConfig;
  baseResult: SimulationResult;
}

export interface ScenarioMatrixResult {
  scenarios: ScenarioPoint[];
  baseIrr: number;
  baseNpv: number;
  optimal: ScenarioPoint;
  computedAt: string;
  durationMs: number;
}

export function runScenarioMatrix(input: ScenarioMatrixInput): ScenarioMatrixResult {
  const t0 = Date.now();
  const { baseConfig, baseResult } = input;

  const baseGenAnnual = baseResult.generationByYear[0].reduce((a, b) => a + b, 0);
  const baseCapex = baseResult.finance.totalCapexTl;
  const baseConsumption = baseConfig.consumption.annualKwh;
  const purchasePrice = baseConfig.tariff.purchasePriceTlKwh;
  const salePrice = baseConfig.tariff.salePriceTlKwh;
  const discountRate = baseConfig.financing.discountRatePct / 100;
  const years = baseConfig.analysisYears;
  const electricityInflation = baseConfig.tariff.electricityInflationPct / 100;
  const opexInflation = baseConfig.fx.trInflationPct / 100;

  // Kullanıcı CAPEX/OPEX inputs verdiyse onları kullan, yoksa scaling factor (eski yöntem)
  const userInputs = baseConfig.scenarioMatrixInputs;
  const useUserInputs = !!userInputs;

  // BatterySize ratio → kWh kapasite (günlük üretim ortalaması × ratio)
  const dailyGenAvg = baseGenAnnual / 365;

  const scenarios: ScenarioPoint[] = [];

  for (const dcAc of DC_AC_VALUES) {
    for (const structure of STRUCTURE_VALUES) {
      for (const batRatio of BATTERY_RATIOS) {
        // Yapı bazlı CAPEX: kullanıcı verdiyse direkt, yoksa structure premium × base
        let structureCapex: number;
        let structureOpexPerKwp: number;
        if (useUserInputs) {
          const capexUsdWp = userInputs.capexUsdPerWp[structure] ?? 0.48;
          structureCapex = baseConfig.pv.peakPowerKwp * 1000 * capexUsdWp * baseConfig.fx.usdTry;
          structureOpexPerKwp = userInputs.opexTlPerKwpYear[structure] ?? baseConfig.opex.omTlPerKwpYear;
        } else {
          const structurePremium = structure.includes('tracker') ? 1.15 : structure.includes('bifacial') ? 1.05 : 1.0;
          structureCapex = baseCapex * structurePremium;
          structureOpexPerKwp = baseConfig.opex.omTlPerKwpYear;
        }

        const point = evaluateScenario({
          dcAc,
          structure,
          batRatio,
          baseGenAnnual,
          structureCapex,
          structureOpexPerKwp,
          baseConsumption,
          purchasePrice,
          salePrice,
          discountRate,
          years,
          electricityInflation,
          opexInflation,
          dailyGenAvg,
          peakPowerKwp: baseConfig.pv.peakPowerKwp,
          opex: baseConfig.opex,
          usdTry: baseConfig.fx.usdTry,
          batteryCapexTlPerKwh: userInputs?.batteryCapexTlPerKwh ?? baseConfig.battery.capexTlPerKwh ?? 8500,
        });
        scenarios.push(point);
      }
    }
  }

  // Optimal = en yüksek NPV
  const optimal = scenarios.reduce((best, s) => (s.projectNpv > best.projectNpv ? s : best), scenarios[0]);

  return {
    scenarios,
    baseIrr: baseResult.finance.irrPct,
    baseNpv: baseResult.finance.npvTl,
    optimal,
    computedAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
  };
}

interface EvalInput {
  dcAc: number;
  structure: StructureType;
  batRatio: number;
  baseGenAnnual: number;
  /** Yapı için temel CAPEX (USD/Wp × kWp × usdTry — DC/AC premium öncesi) */
  structureCapex: number;
  /** Yapı için yıllık OPEX (TL/kWp/yıl) */
  structureOpexPerKwp: number;
  baseConsumption: number;
  purchasePrice: number;
  salePrice: number;
  discountRate: number;
  years: number;
  electricityInflation: number;
  opexInflation: number;
  dailyGenAvg: number;
  peakPowerKwp: number;
  opex: ProjectConfig['opex'];
  usdTry: number;
  batteryCapexTlPerKwh: number;
}

function evaluateScenario(e: EvalInput): ScenarioPoint {
  const yieldFactor = STRUCTURE_YIELD_FACTOR[e.structure];
  // DC/AC arttıkça üretim artar ama clipping kaybı da artar
  const dcAcGenMultiplier = e.dcAc <= 1.2 ? e.dcAc : 1.2 + (e.dcAc - 1.2) * 0.6;
  const annualGen = e.baseGenAnnual * yieldFactor * dcAcGenMultiplier;

  // Mahsuplaşma yaklaşık
  const selfConsumptionRatio = Math.min(0.95, 0.50 + e.batRatio * 0.35);
  const netted = Math.min(annualGen, e.baseConsumption) * selfConsumptionRatio;
  const surplus = Math.max(0, annualGen - netted);
  const paidSurplus = Math.min(surplus, e.baseConsumption);

  // CAPEX: yapı bazlı + DC/AC premium + batarya
  const dcAcPremium = 0.85 + e.dcAc * 0.15; // 1.0 → 1.0, 1.4 → 1.06
  const batteryKwh = e.dailyGenAvg * e.batRatio;
  const batteryCapex = batteryKwh * e.batteryCapexTlPerKwh;
  const totalCapex = e.structureCapex * dcAcPremium + batteryCapex;

  // Yıllık nakit akış (yapı bazlı OPEX kullan)
  const yearlyRevenue = netted * e.purchasePrice + paidSurplus * e.salePrice;
  const yearlyOpex = e.structureOpexPerKwp * e.peakPowerKwp + e.opex.spareParts + e.opex.managementFees + totalCapex * e.opex.insurancePctCapex;

  // 25 yıllık iskontolu nakit akış (degredasyon ihmal — kabaca tahmin)
  const cashFlows: number[] = [-totalCapex];
  for (let y = 1; y <= e.years; y++) {
    const priceMul = Math.pow(1 + e.electricityInflation, y - 1);
    const opexMul = Math.pow(1 + e.opexInflation, y - 1);
    const cf = (yearlyRevenue * priceMul - yearlyOpex * opexMul) * 0.85; // %15 vergi tahmini
    cashFlows.push(cf);
  }

  const npv = cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + e.discountRate, t), 0);
  const irr = computeIrrSimple(cashFlows);

  // Payback (basit)
  let payback = Infinity;
  let cum = cashFlows[0];
  for (let t = 1; t < cashFlows.length; t++) {
    cum += cashFlows[t];
    if (cum >= 0) {
      const prev = cum - cashFlows[t];
      payback = t - 1 + -prev / (cum - prev);
      break;
    }
  }

  // Equity IRR ≈ project IRR + 3-5pp (kredi varsa)
  const equityIrr = irr * 100 * 1.2;

  // LCOE tahmini
  const totalDiscountedGen = Array.from({ length: e.years }, (_, i) => annualGen / Math.pow(1 + e.discountRate, i + 1)).reduce((a, b) => a + b, 0);
  const totalDiscountedCost = totalCapex + Array.from({ length: e.years }, (_, i) => yearlyOpex * Math.pow(1 + e.opexInflation, i) / Math.pow(1 + e.discountRate, i + 1)).reduce((a, b) => a + b, 0);
  const lcoe = totalDiscountedGen > 0 ? totalDiscountedCost / totalDiscountedGen : 0;

  // Min DSCR yaklaşımı: yıllık (CFADS / debt service)
  const debtRatio = 0.6;
  const debtService = totalCapex * debtRatio * 0.18; // 7y annüite tahmini
  const minDscr = debtService > 0 ? (yearlyRevenue - yearlyOpex) * 0.85 / debtService : 999;

  return {
    dcAcRatio: e.dcAc,
    structure: e.structure,
    batterySizeRatio: e.batRatio,
    projectIrr: irr * 100,
    projectNpv: npv,
    equityIrr,
    paybackYears: Number.isFinite(payback) ? payback : 999,
    requiredEquityTl: totalCapex * 0.4,
    lcoeTlKwh: lcoe,
    minDscr,
  };
}

function computeIrrSimple(cashFlows: number[]): number {
  if (cashFlows.length < 2) return 0;
  const npv = (r: number) => cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + r, t), 0);
  let lo = -0.5, hi = 5;
  let fLo = npv(lo), fHi = npv(hi);
  if (fLo * fHi > 0) return 0;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1) return mid;
    if (fMid * fLo < 0) { hi = mid; fHi = fMid; } else { lo = mid; fLo = fMid; }
  }
  return (lo + hi) / 2;
}
