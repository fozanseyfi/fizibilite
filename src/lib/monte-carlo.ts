/**
 * Monte Carlo Risk Analizi — PRD §8.
 *
 * Stokastik değişkenler:
 *   - Yıllık üretim (normal)
 *   - Tüketim büyümesi (truncated normal)
 *   - Elektrik fiyat artışı (triangular)
 *   - TL enflasyon (triangular)
 *   - USD/TL kur (Geometric Brownian Motion)
 *   - Panel degradasyon (truncated normal)
 *   - Batarya çevrim ömrü (lognormal)
 *   - O&M maliyet (normal)
 *   - CAPEX aşımı (triangular)
 *
 * Her iterasyon → finansal modeli vektörize yeniden çalıştırır → IRR, NPV, payback üretir.
 * Saatlik veriler iterasyon başına re-simüle edilmez; sadece yıllık çarpanlar değişir.
 * Bu yaklaşım 1000 iterasyon < 5s.
 */

import {
  ProjectConfig,
  NettingResult,
  BatteryDispatchResult,
  MonteCarloResult,
  MonteCarloConfig,
} from './types';
import { computeIRR } from './finance';

export interface MonteCarloInput {
  config: ProjectConfig;
  baseNetting: NettingResult[]; // yıl bazında
  baseBattery: BatteryDispatchResult[];
  baseGenerationAnnual: number[]; // yıllık toplam üretim
  baseConsumptionAnnual: number[]; // yıllık toplam tüketim
  baseTotalCapexTl: number;
  baseLoanPrincipal0: number;
}

export function runMonteCarlo(input: MonteCarloInput): MonteCarloResult {
  const { config } = input;
  const mc = config.monteCarlo;
  const iterations = Math.max(100, Math.min(10_000, mc.iterations));
  const rng = mulberryRng(mc.seed ?? Date.now());

  const irrs = new Array<number>(iterations);
  const npvs = new Array<number>(iterations);
  const paybacks = new Array<number>(iterations);
  const samples = new Array<{ irr: number; npv: number; payback: number }>(iterations);

  for (let i = 0; i < iterations; i++) {
    const draws = drawScenario(mc, rng);
    const { irrPct, npvTl, payback } = computeQuickFinancials(input, draws);
    irrs[i] = irrPct;
    npvs[i] = npvTl;
    paybacks[i] = payback;
    samples[i] = { irr: irrPct, npv: npvTl, payback };
  }

  const irrStats = describe(irrs);
  const npvStats = describe(npvs);
  const paybackStats = describePayback(paybacks);
  const probabilityNpvPositive = npvs.filter((v) => v > 0).length / iterations;

  // Tornado: her değişken için low (P10) / high (P90) draw'da diğerleri sabit
  const tornado = buildTornado(input, mc, rng);

  return {
    iterations,
    irr: irrStats,
    npv: npvStats,
    payback: paybackStats,
    probabilityNpvPositive,
    tornado,
    samples,
  };
}

// ---------- Stokastik çekiş ----------

interface ScenarioDraws {
  generationMultiplier: number;
  consumptionGrowthDelta: number; // baz büyümeye eklenir (pp)
  electricityInflation: number; // % (fraction)
  trInflation: number;
  fxAnnualGrowth: number;
  panelDegradationRate: number;
  cycleLifeRatio: number;
  omMultiplier: number;
  capexOverrun: number;
}

function drawScenario(mc: MonteCarloConfig, rng: () => number): ScenarioDraws {
  return {
    generationMultiplier: clamp(1 + normal(rng) * mc.generationSigmaPct, 0.6, 1.4),
    consumptionGrowthDelta: clamp(normal(rng) * mc.consumptionGrowthSigmaPct, -5, 15),
    electricityInflation: triangular(rng, ...mc.electricityInflationTriangular),
    trInflation: triangular(rng, ...mc.trInflationTriangular),
    fxAnnualGrowth: normal(rng) * mc.fxAnnualVolPct,
    panelDegradationRate: clamp(0.005 + normal(rng) * mc.degradationSigmaPct, 0.003, 0.012),
    cycleLifeRatio: Math.exp(normal(rng) * mc.cycleLifeSigmaPct),
    omMultiplier: 1 + normal(rng) * mc.omSigmaPct,
    capexOverrun: triangular(rng, ...mc.capexOverrunTriangular),
  };
}

// ---------- Hızlı finansal yeniden hesap ----------

function computeQuickFinancials(
  input: MonteCarloInput,
  draws: ScenarioDraws
): { irrPct: number; npvTl: number; payback: number } {
  const { config, baseNetting, baseGenerationAnnual, baseConsumptionAnnual, baseTotalCapexTl } = input;
  const years = config.analysisYears;
  const discountRate = config.financing.discountRatePct / 100;
  const adjustedCapex = baseTotalCapexTl * (1 + draws.capexOverrun);

  const cashFlows: number[] = [-adjustedCapex];

  let cumGenMultiplier = 1.0;

  for (let y = 1; y <= years; y++) {
    const yIdx = y - 1;
    const yearlyDegradation = Math.pow(1 - draws.panelDegradationRate, yIdx);
    cumGenMultiplier = draws.generationMultiplier * yearlyDegradation;

    const genYear = baseGenerationAnnual[yIdx] * cumGenMultiplier;
    const consYear =
      baseConsumptionAnnual[yIdx] * Math.pow(1 + draws.consumptionGrowthDelta / 100, yIdx);

    // Mahsuplaşma oranını baz simülasyondan al, üretim multiplier ile ölçekle
    const baseGen = baseGenerationAnnual[yIdx];
    const baseNetted = baseNetting[yIdx]?.annual.totalNetted ?? 0;
    const basePaid = baseNetting[yIdx]?.annual.totalPaidSurplus ?? 0;
    const baseAutonomy = baseGen > 0 ? baseNetted / baseGen : 0;
    const basePaidShare = baseGen > 0 ? basePaid / baseGen : 0;

    const nettedYear = Math.min(genYear * baseAutonomy, consYear);
    const paidYear = Math.max(0, genYear * basePaidShare);

    const priceMul = Math.pow(1 + draws.electricityInflation, yIdx);
    const purchase = config.tariff.purchasePriceTlKwh * priceMul;
    const sale = config.tariff.salePriceTlKwh * priceMul;

    const revenue = nettedYear * purchase + paidYear * sale;

    const opexMul = Math.pow(1 + draws.trInflation, yIdx) * draws.omMultiplier;
    const opex =
      (config.opex.omTlPerKwpYear * config.pv.peakPowerKwp +
        config.opex.spareParts +
        config.opex.security +
        config.opex.propertyTax +
        config.opex.managementFees) *
        opexMul +
      adjustedCapex * config.opex.insurancePctCapex +
      genYear * config.opex.systemUsageTlKwh;

    const ebitda = revenue - opex;
    const tax = Math.max(0, ebitda - adjustedCapex / config.tax.amortizationYears) * config.tax.corporateTaxPct;
    const cf = ebitda - tax;
    cashFlows.push(cf);
  }

  const npvTl = cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + discountRate, t), 0);
  const irrPct = computeIRR(cashFlows) * 100;

  let cum = cashFlows[0];
  let payback = Infinity;
  for (let t = 1; t < cashFlows.length; t++) {
    cum += cashFlows[t];
    if (cum >= 0) {
      const prev = cum - cashFlows[t];
      payback = t - 1 + -prev / (cum - prev);
      break;
    }
  }

  return { irrPct, npvTl, payback };
}

// ---------- Tornado ----------

function buildTornado(input: MonteCarloInput, mc: MonteCarloConfig, rng: () => number) {
  const variables = [
    'generation', 'consumptionGrowth', 'electricityInflation', 'trInflation',
    'fxGrowth', 'panelDegradation', 'cycleLife', 'omCost', 'capexOverrun',
  ] as const;

  const labelMap: Record<typeof variables[number], string> = {
    generation: 'Yıllık Üretim',
    consumptionGrowth: 'Tüketim Büyümesi',
    electricityInflation: 'Elektrik Fiyat Artışı',
    trInflation: 'TL Enflasyon',
    fxGrowth: 'USD/TL Değişimi',
    panelDegradation: 'Panel Degradasyonu',
    cycleLife: 'Batarya Çevrim Ömrü',
    omCost: 'O&M Maliyeti',
    capexOverrun: 'CAPEX Aşımı',
  };

  const baseDraws = baselineDraws(mc);
  const baseIrr = computeQuickFinancials(input, baseDraws).irrPct;

  return variables.map((v) => {
    const lowDraws = { ...baseDraws, ...lowOf(v, mc) };
    const highDraws = { ...baseDraws, ...highOf(v, mc) };
    const lowIrr = computeQuickFinancials(input, lowDraws).irrPct;
    const highIrr = computeQuickFinancials(input, highDraws).irrPct;
    return {
      variable: labelMap[v],
      lowImpact: lowIrr - baseIrr,
      highImpact: highIrr - baseIrr,
    };
  });
}

function baselineDraws(mc: MonteCarloConfig): ScenarioDraws {
  return {
    generationMultiplier: 1.0,
    consumptionGrowthDelta: 0,
    electricityInflation: mc.electricityInflationTriangular[1],
    trInflation: mc.trInflationTriangular[1],
    fxAnnualGrowth: 0,
    panelDegradationRate: 0.005,
    cycleLifeRatio: 1.0,
    omMultiplier: 1.0,
    capexOverrun: mc.capexOverrunTriangular[1],
  };
}

function lowOf(v: string, mc: MonteCarloConfig): Partial<ScenarioDraws> {
  const k = 1.282; // P10 z-score
  switch (v) {
    case 'generation': return { generationMultiplier: 1 - k * mc.generationSigmaPct };
    case 'consumptionGrowth': return { consumptionGrowthDelta: -k * mc.consumptionGrowthSigmaPct };
    case 'electricityInflation': return { electricityInflation: mc.electricityInflationTriangular[0] };
    case 'trInflation': return { trInflation: mc.trInflationTriangular[0] };
    case 'fxGrowth': return { fxAnnualGrowth: -k * mc.fxAnnualVolPct };
    case 'panelDegradation': return { panelDegradationRate: 0.003 };
    case 'cycleLife': return { cycleLifeRatio: 0.7 };
    case 'omCost': return { omMultiplier: 1 - k * mc.omSigmaPct };
    case 'capexOverrun': return { capexOverrun: mc.capexOverrunTriangular[0] };
    default: return {};
  }
}

function highOf(v: string, mc: MonteCarloConfig): Partial<ScenarioDraws> {
  const k = 1.282;
  switch (v) {
    case 'generation': return { generationMultiplier: 1 + k * mc.generationSigmaPct };
    case 'consumptionGrowth': return { consumptionGrowthDelta: k * mc.consumptionGrowthSigmaPct };
    case 'electricityInflation': return { electricityInflation: mc.electricityInflationTriangular[2] };
    case 'trInflation': return { trInflation: mc.trInflationTriangular[2] };
    case 'fxGrowth': return { fxAnnualGrowth: k * mc.fxAnnualVolPct };
    case 'panelDegradation': return { panelDegradationRate: 0.012 };
    case 'cycleLife': return { cycleLifeRatio: 1.3 };
    case 'omCost': return { omMultiplier: 1 + k * mc.omSigmaPct };
    case 'capexOverrun': return { capexOverrun: mc.capexOverrunTriangular[2] };
    default: return {};
  }
}

// ---------- İstatistik ----------

function describe(arr: number[]): { mean: number; p10: number; p50: number; p90: number; var5: number; var95: number; std: number } {
  const sorted = [...arr].filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return { mean: 0, p10: 0, p50: 0, p90: 0, var5: 0, var95: 0, std: 0 };
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const variance = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / sorted.length;
  return {
    mean,
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    var5: percentile(sorted, 0.05),
    var95: percentile(sorted, 0.95),
    std: Math.sqrt(variance),
  };
}

function describePayback(arr: number[]): { mean: number; p10: number; p50: number; p90: number } {
  const sorted = [...arr].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return { mean: 0, p10: 0, p50: 0, p90: 0 };
  return {
    mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx];
}

// ---------- RNG ----------

function mulberryRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rng: () => number): number {
  // Box-Muller
  const u1 = rng() || 1e-9;
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function triangular(rng: () => number, min: number, mode: number, max: number): number {
  const u = rng();
  const c = (mode - min) / (max - min);
  if (u < c) return min + Math.sqrt(u * (max - min) * (mode - min));
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
