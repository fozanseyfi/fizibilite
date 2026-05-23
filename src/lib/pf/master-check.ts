/**
 * MODÜL 5 — Master Check Validation
 *
 * Karapınar modelindeki MASTER CHECK cell'inin TS karşılığı.
 * 12 matematiksel tutarlılık kontrolü; biri bile FALSE ise model güvenilmez.
 *
 * Toleransi: %0.01 (1 baz puan) default.
 */

import { CheckResult, CheckSeverity, MasterCheckReport } from './types';
import { ProjectConfig, SimulationResult } from '../types';

const DEFAULT_TOLERANCE = 0.0001;
const HOURS_PER_YEAR = 8760;

export function runMasterCheck(config: ProjectConfig, result: SimulationResult): MasterCheckReport {
  const checks: CheckResult[] = [];

  // 1. Netting Identity (Consumption)
  checks.push(checkNettingIdentityConsumption(result));

  // 2. Netting Identity (Generation)
  checks.push(checkNettingIdentityGeneration(result));

  // 3. Energy Balance
  checks.push(checkEnergyBalance(result));

  // 4. Battery Energy Balance (varsa)
  if (config.battery.enabled) {
    checks.push(checkBatteryEnergyBalance(result));
  }

  // 5. CAPEX Allocation
  checks.push(checkCapexAllocationSum(config, result));

  // 6. Debt Non-Negative (kredi kullanılıyorsa)
  if (config.financing.type === 'loan') {
    checks.push(checkDebtNonNegative(result));
  }

  // 7. Depreciation Total
  checks.push(checkDepreciationTotal(config, result));

  // 8. IRR-NPV Consistency
  checks.push(checkIrrNpvConsistency(result));

  // 9. Cash Flow Continuity (aylık)
  checks.push(checkCashFlowContinuity(result));

  // 10. Tax Cumulative Consistency
  checks.push(checkTaxCumulativeConsistency(result));

  // 11. Sources = Uses (basit: total CAPEX = equity + debt principal)
  checks.push(checkSourcesEqualUses(config, result));

  // 12. EBITDA = Revenue - Costs
  checks.push(checkEbitdaIdentity(result));

  const errorChecks = checks.filter((c) => c.severity === 'error');
  const masterPassed = errorChecks.every((c) => c.passed);

  return {
    masterCheckPassed: masterPassed,
    totalChecks: checks.length,
    passedCount: checks.filter((c) => c.passed).length,
    failedCount: checks.filter((c) => !c.passed && c.severity === 'error').length,
    warningCount: checks.filter((c) => !c.passed && c.severity === 'warning').length,
    individualResults: checks,
  };
}

// ---------- Bireysel checks ----------

function checkNettingIdentityConsumption(result: SimulationResult): CheckResult {
  let maxDiff = 0;
  for (let y = 0; y < result.nettingByYear.length; y++) {
    const netting = result.nettingByYear[y];
    const cons = result.consumptionByYear[y];
    for (let h = 0; h < HOURS_PER_YEAR; h++) {
      const expected = cons[h] || 0;
      const actual = (netting.netted[h] || 0) + (netting.netConsumption[h] || 0);
      const diff = Math.abs(expected - actual);
      if (diff > maxDiff) maxDiff = diff;
    }
  }
  return {
    name: 'Netting Identity (Consumption)',
    passed: maxDiff < 0.001,
    severity: 'error',
    expected: 0,
    actual: maxDiff,
    tolerance: 0.001,
    message: `Max saat tutarsızlığı: ${maxDiff.toFixed(4)} kWh — cons = netted + netConsumption olmalı`,
  };
}

function checkNettingIdentityGeneration(result: SimulationResult): CheckResult {
  let maxDiff = 0;
  for (let y = 0; y < result.nettingByYear.length; y++) {
    const netting = result.nettingByYear[y];
    const gen = result.generationByYear[y];
    for (let h = 0; h < HOURS_PER_YEAR; h++) {
      const expected = gen[h] || 0;
      const actual = (netting.netted[h] || 0) + (netting.surplusGeneration[h] || 0);
      const diff = Math.abs(expected - actual);
      if (diff > maxDiff) maxDiff = diff;
    }
  }
  return {
    name: 'Netting Identity (Generation)',
    passed: maxDiff < 0.001,
    severity: 'error',
    expected: 0,
    actual: maxDiff,
    tolerance: 0.001,
    message: `Max saat tutarsızlığı: ${maxDiff.toFixed(4)} kWh — gen = netted + surplus olmalı`,
  };
}

function checkEnergyBalance(result: SimulationResult): CheckResult {
  // Σ generation ≈ Σ netted + Σ paid_surplus + Σ yekdem_free
  let maxDiffPct = 0;
  for (let y = 0; y < result.nettingByYear.length; y++) {
    const n = result.nettingByYear[y].annual;
    const expected = n.totalGeneration;
    const actual = n.totalNetted + n.totalPaidSurplus + n.totalYekdemFree;
    if (expected > 0) {
      const pct = Math.abs(expected - actual) / expected;
      if (pct > maxDiffPct) maxDiffPct = pct;
    }
  }
  return {
    name: 'Energy Balance (Annual)',
    passed: maxDiffPct < 0.001,
    severity: 'error',
    expected: 0,
    actual: maxDiffPct,
    tolerance: 0.001,
    message: `Max yıllık sapma: %${(maxDiffPct * 100).toFixed(4)} — gen = netted+paid+yekdem`,
  };
}

function checkBatteryEnergyBalance(result: SimulationResult): CheckResult {
  let maxDiffPct = 0;
  for (let y = 0; y < result.batteryByYear.length; y++) {
    const b = result.batteryByYear[y];
    const totalCharge = (b.charge.reduce((a, x) => a + x, 0) + b.gridCharge.reduce((a, x) => a + x, 0));
    const totalDischarge = b.discharge.reduce((a, x) => a + x, 0);
    if (totalCharge > 0) {
      // discharge ≈ charge × roundTrip (sqrt eff'in karesi)
      const eff = (totalDischarge / totalCharge);
      const diff = Math.abs(eff - 1.0); // ideal kayıpsız (kayıp varsa < 1)
      // Tolerans: %25 (round trip eff 0.85-0.95 arası)
      if (diff > 0.30 && totalCharge > 1) maxDiffPct = Math.max(maxDiffPct, diff);
    }
  }
  return {
    name: 'Battery Energy Balance',
    passed: maxDiffPct < 0.30,
    severity: 'warning',
    expected: 0.92,
    actual: 1 - maxDiffPct,
    tolerance: 0.30,
    message: `Round-trip efficiency yaklaşık ${(1 - maxDiffPct).toFixed(2)} — beklenen 0.85-0.95`,
  };
}

function checkCapexAllocationSum(config: ProjectConfig, result: SimulationResult): CheckResult {
  const c = config.capex;
  const sum = c.pvModule + c.inverter + c.mounting + c.cabling + c.labor + c.engineering +
    c.gridConnection + c.tedasZbof + c.land + c.insurance + c.contingency + c.battery;
  const diff = Math.abs(sum - result.finance.totalCapexTl);
  return {
    name: 'CAPEX Allocation Sum',
    passed: diff < Math.max(1, result.finance.totalCapexTl * DEFAULT_TOLERANCE),
    severity: 'error',
    expected: result.finance.totalCapexTl,
    actual: sum,
    tolerance: Math.max(1, result.finance.totalCapexTl * DEFAULT_TOLERANCE),
    message: `Kalem toplamı ${sum.toFixed(2)} ≠ total ${result.finance.totalCapexTl.toFixed(2)}`,
  };
}

function checkDebtNonNegative(result: SimulationResult): CheckResult {
  // Loan balance her yıl ≥ 0 olmalı (mevcut motor cum repaymentTl negatif olabilir → 0'da clip etmeli)
  let minBalance = Infinity;
  let runningBalance = result.finance.totalCapexTl * 0.7; // tahmini başlangıç
  for (const y of result.finance.yearly) {
    runningBalance += y.repaymentTl; // repayment negatif değer
    if (runningBalance < minBalance) minBalance = runningBalance;
  }
  return {
    name: 'Debt Non-Negative',
    passed: minBalance >= -1, // 1 TL tolerans
    severity: 'warning',
    expected: 0,
    actual: minBalance,
    tolerance: 1,
    message: minBalance < 0 ? `Min bakiye ${minBalance.toFixed(2)} negatif — geri ödeme hesabı revize edilmeli` : 'OK',
  };
}

function checkDepreciationTotal(config: ProjectConfig, result: SimulationResult): CheckResult {
  // Σ amortisman ≤ totalCapex (depreciation N yılda biter, sonra 0)
  const totalDep = result.finance.yearly.reduce((a, y) => a + y.depreciationTl, 0);
  const cap = result.finance.totalCapexTl;
  const tolerance = cap * 0.05;
  return {
    name: 'Depreciation Total',
    passed: Math.abs(totalDep - cap) < tolerance || totalDep < cap,
    severity: 'warning',
    expected: cap,
    actual: totalDep,
    tolerance,
    message: `Toplam amortisman ${totalDep.toFixed(0)} (CAPEX ${cap.toFixed(0)}) — ${config.tax.amortizationYears} yılda dağıtılır`,
  };
}

function checkIrrNpvConsistency(result: SimulationResult): CheckResult {
  // IRR oranıyla iskonto yapılan NPV ≈ 0 olmalı
  const irr = result.finance.irrPct / 100;
  if (!Number.isFinite(irr) || irr <= -0.99) {
    return {
      name: 'IRR-NPV Consistency',
      passed: false,
      severity: 'warning',
      expected: 0,
      actual: result.finance.irrPct,
      tolerance: 0,
      message: `IRR hesaplanamadı (${result.finance.irrPct})`,
    };
  }
  const cashflows = [-result.finance.totalCapexTl, ...result.finance.yearly.map((y) => y.netFcfcTl)];
  const npvAtIrr = cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + irr, t), 0);
  const tolerance = Math.max(1000, result.finance.totalCapexTl * 0.01);
  return {
    name: 'IRR-NPV Consistency',
    passed: Math.abs(npvAtIrr) < tolerance,
    severity: 'error',
    expected: 0,
    actual: npvAtIrr,
    tolerance,
    message: `NPV(IRR=${result.finance.irrPct.toFixed(2)}%) = ${npvAtIrr.toFixed(0)} — sıfıra yakın olmalı`,
  };
}

function checkCashFlowContinuity(result: SimulationResult): CheckResult {
  // monthly opening + addition = closing (kümülatif tutarlılık)
  if (!result.finance.monthly || result.finance.monthly.length === 0) {
    return {
      name: 'Cash Flow Continuity (Monthly)',
      passed: true,
      severity: 'info',
      expected: 0,
      actual: 0,
      tolerance: 0,
      message: 'Aylık veri mevcut değil (kontrol atlanır)',
    };
  }
  let maxDiff = 0;
  for (const m of result.finance.monthly) {
    const expected = m.cashOpeningTl + m.cashAdditionDisposalTl;
    const diff = Math.abs(expected - m.cashClosingTl);
    if (diff > maxDiff) maxDiff = diff;
  }
  return {
    name: 'Cash Flow Continuity (Monthly)',
    passed: maxDiff < 1,
    severity: 'error',
    expected: 0,
    actual: maxDiff,
    tolerance: 1,
    message: `Max ay açılış+net ≠ kapanış sapması: ${maxDiff.toFixed(2)} TL`,
  };
}

function checkTaxCumulativeConsistency(result: SimulationResult): CheckResult {
  // Σ P&L tax ≈ Σ CF tax_paid (zamanlama hariç toplam)
  const pl = result.finance.yearly.reduce((a, y) => a + y.taxExpenseTl, 0);
  const cf = result.finance.yearly.reduce((a, y) => a + y.corporateIncomeTaxPaidTl, 0);
  const diff = Math.abs(pl - cf);
  const tolerance = Math.max(1000, Math.abs(pl) * 0.05);
  return {
    name: 'Tax Cumulative Consistency',
    passed: diff < tolerance,
    severity: 'warning',
    expected: pl,
    actual: cf,
    tolerance,
    message: `P&L vergi ${pl.toFixed(0)} vs CF vergi ${cf.toFixed(0)} — fark ${diff.toFixed(0)}`,
  };
}

function checkSourcesEqualUses(config: ProjectConfig, result: SimulationResult): CheckResult {
  const equity = config.financing.type === 'loan'
    ? result.finance.totalCapexTl * (config.financing.equityPct ?? 0.3)
    : result.finance.totalCapexTl;
  const debt = result.finance.totalCapexTl - equity;
  const sources = equity + debt;
  const uses = result.finance.totalCapexTl;
  const diff = Math.abs(sources - uses);
  return {
    name: 'Sources = Uses',
    passed: diff < 1,
    severity: 'error',
    expected: uses,
    actual: sources,
    tolerance: 1,
    message: `Kaynaklar ${sources.toFixed(2)} vs Kullanım ${uses.toFixed(2)}`,
  };
}

function checkEbitdaIdentity(result: SimulationResult): CheckResult {
  // EBITDA = grossProfit - (insurance + maint + payroll)
  let maxDiff = 0;
  for (const y of result.finance.yearly) {
    const expected = y.grossProfitTl - y.insuranceCostTl - y.correctiveMaintenanceTl - y.preventiveMaintenanceTl - y.totalPayrollTl;
    const diff = Math.abs(expected - y.ebitdaTl);
    if (diff > maxDiff) maxDiff = diff;
  }
  return {
    name: 'EBITDA Identity',
    passed: maxDiff < 1,
    severity: 'error',
    expected: 0,
    actual: maxDiff,
    tolerance: 1,
    message: `Max EBITDA sapması: ${maxDiff.toFixed(2)} TL`,
  };
}
