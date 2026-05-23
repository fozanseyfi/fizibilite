/**
 * MODÜL 3 — DSCR (çeyreklik) + LLCR + PLCR
 *
 * Banka kredi onayında zorunlu üç oran:
 *   - DSCR = CFADS / Debt Service (her çeyrek operasyon döneminde)
 *   - LLCR = NPV(CFADS, loan_term_quarters) / Outstanding Debt
 *   - PLCR = NPV(CFADS, project_life_quarters) / Outstanding Debt
 *
 * Eşikler (default):
 *   - Min DSCR ≥ 1.20  (zorunlu — banka kırmızı çizgi)
 *   - Avg DSCR ≥ 1.40
 *   - LLCR ≥ 1.30
 *   - PLCR ≥ 1.50
 *
 * Status:
 *   - green: tüm eşikler geçer
 *   - yellow: en az 1 eşik borderline (Min DSCR 1.20-1.30 arası)
 *   - red: Min DSCR < 1.20 veya birden fazla kritik eşik fail
 */

import { QuarterlyCashFlow, CoverageResult, BankThresholds, BankApprovalStatus, DEFAULT_BANK_THRESHOLDS } from './types';

export function calculateCoverageRatios(
  cashflows: QuarterlyCashFlow[],
  loanTermQuarters: number,
  projectLifeQuarters: number,
  annualDiscountRate: number,
  thresholds: BankThresholds = DEFAULT_BANK_THRESHOLDS
): CoverageResult {
  const operating = cashflows.filter((cf) => cf.isOperatingPeriod);

  // DSCR çeyreklik — debt service > 0 olan çeyreklerde
  const dscrList: number[] = [];
  for (const cf of operating) {
    if (cf.debtService > 0) {
      dscrList.push(cf.cfads / cf.debtService);
    }
  }

  const minDscr = dscrList.length > 0 ? Math.min(...dscrList) : 0;
  const avgDscr = dscrList.length > 0 ? dscrList.reduce((a, b) => a + b, 0) / dscrList.length : 0;

  // Çeyreklik iskonto oranı (yıllık → çeyreklik)
  const quarterlyDisc = Math.pow(1 + annualDiscountRate, 0.25) - 1;

  // LLCR — kredi vadesi boyunca indirgenmiş CFADS / başlangıç bakiyesi
  const loanCfads = operating.slice(0, loanTermQuarters).map((cf) => cf.cfads);
  const npvLoan = loanCfads.reduce((acc, cf, i) => acc + cf / Math.pow(1 + quarterlyDisc, i + 1), 0);
  const outstandingAtCod = operating[0]?.outstandingDebt ?? 1;
  const llcr = outstandingAtCod > 0 ? npvLoan / outstandingAtCod : 0;

  // PLCR — proje ömrü boyunca
  const projectCfads = operating.slice(0, projectLifeQuarters).map((cf) => cf.cfads);
  const npvProject = projectCfads.reduce((acc, cf, i) => acc + cf / Math.pow(1 + quarterlyDisc, i + 1), 0);
  const plcr = outstandingAtCod > 0 ? npvProject / outstandingAtCod : 0;

  // Status değerlendirme
  const { status, failed } = evaluateThresholds({ minDscr, avgDscr, llcr, plcr }, thresholds);

  return {
    dscrQuarterly: dscrList,
    minDscr,
    avgDscr,
    llcr,
    plcr,
    bankApprovalStatus: status,
    failedThresholds: failed,
  };
}

function evaluateThresholds(
  metrics: { minDscr: number; avgDscr: number; llcr: number; plcr: number },
  t: BankThresholds
): { status: BankApprovalStatus; failed: string[] } {
  const failed: string[] = [];
  let criticalFail = false;
  let borderline = false;

  if (metrics.minDscr < t.minDscrFloor) {
    failed.push(`Min DSCR ${metrics.minDscr.toFixed(2)} < ${t.minDscrFloor} (banka kırmızı eşik)`);
    criticalFail = true;
  } else if (metrics.minDscr < t.minDscrTarget) {
    failed.push(`Min DSCR ${metrics.minDscr.toFixed(2)} < target ${t.minDscrTarget} (borderline)`);
    borderline = true;
  }

  if (metrics.avgDscr < t.avgDscrTarget) {
    failed.push(`Avg DSCR ${metrics.avgDscr.toFixed(2)} < target ${t.avgDscrTarget}`);
    borderline = true;
  }

  if (metrics.llcr < t.llcrTarget) {
    failed.push(`LLCR ${metrics.llcr.toFixed(2)} < target ${t.llcrTarget}`);
    borderline = true;
  }

  if (metrics.plcr < t.plcrTarget) {
    failed.push(`PLCR ${metrics.plcr.toFixed(2)} < target ${t.plcrTarget}`);
    borderline = true;
  }

  let status: BankApprovalStatus = 'green';
  if (criticalFail) status = 'red';
  else if (borderline) status = 'yellow';

  return { status, failed };
}

/**
 * Mevcut finance result'tan QuarterlyCashFlow listesi türet.
 * Aylık period'ları çeyreğe agregate eder.
 */
export function buildQuarterlyCashFlowsFromMonthly(monthly: Array<{ cfadsTl: number; interestExpenseTl: number; repaymentTl: number; year: number; month?: number }>, totalDebtPrincipal: number): QuarterlyCashFlow[] {
  const out: QuarterlyCashFlow[] = [];
  let outstanding = totalDebtPrincipal;
  let qIdx = 0;
  for (let i = 0; i < monthly.length; i += 3) {
    const chunk = monthly.slice(i, i + 3);
    const cfads = chunk.reduce((a, b) => a + (b.cfadsTl || 0), 0);
    const interest = chunk.reduce((a, b) => a + (b.interestExpenseTl || 0), 0);
    const principal = chunk.reduce((a, b) => a + Math.abs(b.repaymentTl || 0), 0);
    const debtService = interest + principal;
    outstanding = Math.max(0, outstanding - principal);
    out.push({
      quarterIndex: qIdx++,
      cfads,
      debtService,
      outstandingDebt: outstanding,
      isOperatingPeriod: true, // tüm operasyon dönemi (construction ayrı simüle edilmiyor mevcut motorda)
    });
  }
  return out;
}
