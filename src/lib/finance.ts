/**
 * Finansal Model — banka şablonu uyumlu (P&L + Cash Flow Statement + Cash Waterfall).
 *
 * Yapı: PRD §7 + kullanıcının onayladığı görsel şema.
 *
 * Yıllık değerler aylık tabandan agregate edilir; iki tablo (monthly, yearly) döner.
 * Saatlik mahsuplaşma motorundan gelen yıllık veri, aya proporsiyonel dağıtılır.
 */

import {
  ProjectConfig,
  NettingResult,
  BatteryDispatchResult,
  FinanceResult,
  PeriodFinance,
  HOURS_PER_YEAR,
} from './types';
import { generateCapexSchedule } from './pf/capex-schedule';
import { calculateIdc } from './pf/idc';

const CO2_INTENSITY_KG_PER_KWH = 0.45;
const TREES_PER_TON_CO2 = 16.5;
const DPM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const HOURS_PER_MONTH = DPM.map((d) => d * 24);

export interface FinanceInput {
  config: ProjectConfig;
  nettingByYear: NettingResult[];
  batteryByYear: BatteryDispatchResult[];
  generationByYear: number[][];
  consumptionByYear: number[][];
}

export function computeFinance(input: FinanceInput): FinanceResult {
  const { config, nettingByYear, batteryByYear, generationByYear, consumptionByYear } = input;
  const years = config.analysisYears;
  const discountRate = config.financing.discountRatePct / 100;

  const baseCapexTl = computeTotalCapex(config);

  // MODÜL 1+2: IDC ve S-curve (sadece loan finansmanında)
  let idcTotal = 0;
  let arrangementFee = 0;
  let commitmentFeeTotal = 0;
  if (config.financing.type === 'loan' && config.financing.construction) {
    const cc = config.financing.construction;
    const equityPct = config.financing.equityPct ?? 0.3;
    const debtRatio = 1 - equityPct;
    const schedule = generateCapexSchedule({
      totalCapexTl: baseCapexTl,
      constructionMonths: cc.monthsToCod,
      curveType: cc.curveType,
      customMonthlyPct: cc.customMonthlyPct,
    });
    const idc = calculateIdc({
      monthlyCapexDrawdowns: schedule.monthlyCapexTotal,
      debtRatio,
      annualInterestRate: (config.financing.interestRatePctTl ?? 35) / 100,
      commitmentFeeRate: cc.commitmentFeeRate ?? 0.005,
      arrangementFeePct: cc.arrangementFeePct ?? 0.01,
    });
    if (cc.capitalizeIdc !== false) {
      idcTotal = idc.totalIdc;
    }
    arrangementFee = idc.arrangementFee;
    commitmentFeeTotal = idc.monthlyCommitmentFee.reduce((a, b) => a + b, 0);
  }

  // IDC kapitalize edildiyse total CAPEX'e ekleniyor (amortisman base artar)
  const totalCapexTl = baseCapexTl + idcTotal + arrangementFee + commitmentFeeTotal;
  const loanSchedule = buildLoanSchedule(config, totalCapexTl);
  const augmentationCapexByYear = computeAugmentationCapex(config);

  // Aylık seviyede tüm dönemleri üret
  const monthly: PeriodFinance[] = [];
  let cumFcfc = -totalCapexTl + loanSchedule.principal0;
  let cumDiscFcfc = cumFcfc;
  let cumFcfe = -(totalCapexTl - loanSchedule.principal0); // sadece equity kısmı yatırım sayılır
  let cumDiscFcfe = cumFcfe;
  let cashBalance = loanSchedule.principal0 - (totalCapexTl - loanSchedule.principal0);
  let loanBalance = loanSchedule.principal0;
  let owcPrev = 0;

  let periodIndex = 0;

  for (let y = 1; y <= years; y++) {
    const yIdx = y - 1;
    const netting = nettingByYear[yIdx];
    const battery = batteryByYear[yIdx];
    const generation = generationByYear[yIdx];
    const consumption = consumptionByYear[yIdx];

    // Aylık ayrıştırma için saatlik dizileri aya böl
    const monthlyEnergyShares = monthlySharesFromHourly(generation, consumption, netting);

    // Yıllık inşa parametreleri
    const electricityInflation = config.tariff.electricityInflationPct / 100;
    const opexInflation = config.fx.trInflationPct / 100;
    const priceMul = Math.pow(1 + electricityInflation, yIdx);
    const purchase = config.tariff.purchasePriceTlKwh * priceMul;
    let sale = config.tariff.salePriceTlKwh * priceMul;
    const opexMul = Math.pow(1 + opexInflation, yIdx);

    // PPA — Power Purchase Agreement
    let ppaSurplusPrice: number | null = null;
    if (config.ppa?.enabled && y <= config.ppa.ppaTermYears) {
      const ppaMul = Math.pow(1 + (config.ppa.ppaEscalationPct ?? 0) / 100, yIdx);
      ppaSurplusPrice = config.ppa.ppaPriceTlKwh * ppaMul;
      if (config.ppa.scope === 'all') sale = ppaSurplusPrice;
    }

    // Carbon credit (yıllık)
    let annualCarbonCreditTl = 0;
    let annualCarbonCertCostTl = 0;
    if (config.carbonCredit?.enabled && y <= config.carbonCredit.creditingPeriodYears) {
      const annualGenY = generationByYear[yIdx].reduce((a, b) => a + b, 0);
      const tonsCO2 = (annualGenY * 0.45) / 1000; // TR grid factor
      annualCarbonCreditTl = tonsCO2 * config.carbonCredit.pricePerTonUsd * config.fx.usdTry;
      annualCarbonCertCostTl = config.carbonCredit.certificationCostUsdYearly * config.fx.usdTry * opexMul;
    }

    // Yıllık kalemler
    const annualOpex = computeAnnualOpex(config, totalCapexTl, opexMul, y);
    const annualOpexBreakdown = annualOpex.breakdown;
    const annualOpexTotal = annualOpex.total;

    const annualAmortization = y <= config.tax.amortizationYears ? totalCapexTl / config.tax.amortizationYears : 0;
    const annualLeasing = config.financing.type === 'leasing' ? leasingPayment(config, y) : 0;
    const annualAugCapex = augmentationCapexByYear[yIdx] || 0;

    // Yıllık kredi
    let annualInterest = 0;
    let annualPrincipal = 0;
    if (config.financing.type === 'loan' && loanBalance > 0) {
      const sched = loanSchedule.yearly[yIdx];
      if (sched) { annualInterest = sched.interest; annualPrincipal = sched.principal; }
    }

    // Yıllık scrap (sadece son yıl)
    const annualScrap = y === years ? totalCapexTl * 0.03 : 0;

    // Yıllık FX gain/loss (basit GBM yaklaşımı: yıllık kur değişimi × USD-eq pozisyon)
    const annualFxGainLoss = computeAnnualFxGainLoss(config, totalCapexTl, yIdx);

    // 12 aylık döngü
    for (let m = 1; m <= 12; m++) {
      periodIndex++;
      const mShare = monthlyEnergyShares[m - 1];

      // Enerji
      const periodGen = mShare.generation;
      const periodCons = mShare.consumption;
      const periodNetted = mShare.netted;
      const periodPaidSurplus = mShare.paidSurplus * (annualSum(netting.paidSurplus) > 0 ? 1 : 0);
      const periodYekdem = mShare.yekdem;

      // Gelir
      const savingsFromNetting = periodNetted * purchase;
      const surplusPrice = ppaSurplusPrice ?? sale;
      const saleRevenue = periodPaidSurplus * surplusPrice;
      const carbonRev = annualCarbonCreditTl / 12;
      let batteryArb = 0;
      if (config.battery.enabled && battery) {
        const totalDis = battery.discharge.reduce((a, b) => a + b, 0);
        const totalGridChg = battery.gridCharge.reduce((a, b) => a + b, 0);
        const monthShare = HOURS_PER_MONTH[m - 1] / HOURS_PER_YEAR;
        batteryArb = (totalDis * sale - totalGridChg * purchase) * monthShare;
      }
      const peakShaveSavings = config.battery.enabled && config.battery.enablePeakShaving
        ? batteryArb * 0.1
        : 0;

      const salesRevenue = savingsFromNetting + saleRevenue + batteryArb + peakShaveSavings + carbonRev;
      const scrappedEquipment = m === 12 ? annualScrap : 0;
      const netSales = salesRevenue + scrappedEquipment;

      // İletim ve diğer bedeller (aktif enerji × ortalama)
      const transmissionShare = (config.tariff.distributionFeeTlKwh || 0) * 0.4;
      const transmissionOperationalFees = periodNetted * transmissionShare * 0.5;
      const otherFees = periodGen * 0.02 * priceMul; // küçük ölçek diğer

      const grossProfit = netSales - transmissionOperationalFees - otherFees;

      // OPEX kalemleri (yıllık toplamı 12'ye böl ama mevsimsel/sabit kalemleri olduğu gibi)
      const insuranceCost = annualOpexBreakdown.insurance / 12;
      const corrective = annualOpexBreakdown.corrective / 12;
      const preventive = annualOpexBreakdown.preventive / 12;
      const payroll = annualOpexBreakdown.payroll / 12;

      const ebitda = grossProfit - insuranceCost - corrective - preventive - payroll;
      const depreciation = annualAmortization / 12;
      const ebit = ebitda - depreciation;
      const fxGainLoss = annualFxGainLoss / 12;
      const interestExpense = (annualInterest + (config.financing.type === 'leasing' ? annualLeasing : 0)) / 12;
      const earningsBeforeTax = ebit + fxGainLoss - interestExpense;

      const fxAddback = -fxGainLoss; // vergi matrahından düşülür (kazanç ise) veya eklenir (kayıp ise)
      const taxableIncome = earningsBeforeTax + fxAddback;
      let taxRate = config.tax.corporateTaxPct;
      if (config.tax.investmentIncentiveEnabled) taxRate *= 1 - config.tax.incentiveCorpTaxReductionPct;
      const taxExpense = Math.max(0, taxableIncome) * taxRate;
      const netIncome = earningsBeforeTax - taxExpense;

      // CASH FLOW STATEMENT
      const cfRevenue = salesRevenue;
      const cfAllInCostOfSales = -(insuranceCost + corrective + preventive + payroll + transmissionOperationalFees + otherFees);
      // OWC = 30 günlük gelir gideri farkı (basit yaklaşım)
      const owcRequired = (cfRevenue + cfAllInCostOfSales) * (30 / 365);
      const changeInOwc = owcRequired - owcPrev;
      owcPrev = owcRequired;
      const vatCf = (cfRevenue * config.tax.vatPct) - (cfAllInCostOfSales * -1 * config.tax.vatPct); // basit netto
      const corporateIncomeTaxCf = -taxExpense;
      const netOperatingCashFlow = cfRevenue + cfAllInCostOfSales - changeInOwc - vatCf + corporateIncomeTaxCf;

      // Investing
      const capexCf = -(m === 1 ? annualAugCapex : 0); // augmentation yılbaşında bir kez
      const netInvestingCashFlow = capexCf;

      // Financing
      const drawdown = (y === 1 && m === 1) ? loanSchedule.principal0 : 0;
      const repayment = -annualPrincipal / 12;
      const interestCf = -annualInterest / 12;
      const commitmentFee = drawdown > 0 ? drawdown * 0.005 : 0;
      const arrangementFee = drawdown > 0 ? drawdown * 0.01 : 0;
      const equity = (y === 1 && m === 1) ? totalCapexTl - loanSchedule.principal0 : 0;
      const additionalEquityToCureDscr = 0;
      const nwcDrawdown = 0;
      const nwcRepayment = 0;
      const netFinancingCashFlow = drawdown + repayment + interestCf - commitmentFee - arrangementFee + equity + additionalEquityToCureDscr + nwcDrawdown + nwcRepayment;

      // Cash Balance
      const cashOpening = cashBalance;
      const cashAdditionDisposal = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;
      const cashClosing = cashOpening + cashAdditionDisposal;
      cashBalance = cashClosing;

      // CASH WATERFALL
      const revenues = cfRevenue;
      const operatingCosts = -cfAllInCostOfSales;
      const changeInWc = changeInOwc;
      const netVat = vatCf;
      const capexWf = -capexCf; // pozitif harcama
      const opCfBeforeTax = revenues - operatingCosts - changeInWc - netVat - capexWf;
      const corpTaxPaid = taxExpense;
      const cfads = opCfBeforeTax - corpTaxPaid;

      // FCFC (proje seviyesi — finansman öncesi)
      const netFcfc = cfads + capexWf - capexWf; // = cfads (finansman öncesi)
      const discountRateMonthly = Math.pow(1 + discountRate, 1 / 12) - 1;
      const discFcfc = netFcfc / Math.pow(1 + discountRateMonthly, periodIndex);
      cumFcfc += netFcfc;
      cumDiscFcfc += discFcfc;

      // FCFE (sermaye sahibi seviyesi — finansman sonrası)
      const netFcfe = cfads - (annualPrincipal / 12) - (annualInterest / 12);
      const discFcfe = netFcfe / Math.pow(1 + discountRateMonthly, periodIndex);
      cumFcfe += netFcfe;
      cumDiscFcfe += discFcfe;

      const debtService = (annualInterest + annualPrincipal) / 12;
      const dscr = debtService > 0 ? (netOperatingCashFlow + interestCf) / debtService : 0;

      monthly.push({
        periodIndex,
        year: y,
        month: m,
        quarter: Math.ceil(m / 3),
        label: `Y${y}-${String(m).padStart(2, '0')}`,

        generationKwh: periodGen,
        consumptionKwh: periodCons,
        nettedKwh: periodNetted,
        paidSurplusKwh: periodPaidSurplus,
        yekdemFreeKwh: periodYekdem,

        salesRevenueTl: salesRevenue,
        scrappedEquipmentTl: scrappedEquipment,
        netSalesTl: netSales,
        transmissionOperationalFeesTl: transmissionOperationalFees,
        otherFeesTl: otherFees,
        grossProfitTl: grossProfit,
        insuranceCostTl: insuranceCost,
        correctiveMaintenanceTl: corrective,
        preventiveMaintenanceTl: preventive,
        totalPayrollTl: payroll,
        ebitdaTl: ebitda,
        depreciationTl: depreciation,
        ebitTl: ebit,
        fxGainLossTl: fxGainLoss,
        interestExpenseTl: interestExpense,
        earningsBeforeTaxTl: earningsBeforeTax,
        fxGainLossAddbackTl: fxAddback,
        taxExpenseTl: taxExpense,
        netIncomeTl: netIncome,

        cfRevenueTl: cfRevenue,
        cfAllInCostOfSalesTl: cfAllInCostOfSales,
        owcRequirementTl: owcRequired,
        changeInOwcTl: changeInOwc,
        corporateIncomeTaxCfTl: corporateIncomeTaxCf,
        vatCfTl: vatCf,
        netOperatingCashFlowTl: netOperatingCashFlow,
        capexCfTl: capexCf,
        netInvestingCashFlowTl: netInvestingCashFlow,
        drawdownTl: drawdown,
        repaymentTl: repayment,
        interestExpenseCfTl: interestCf,
        commitmentFeeTl: commitmentFee,
        arrangementFeeTl: arrangementFee,
        equityTl: equity,
        additionalEquityToCureDscrTl: additionalEquityToCureDscr,
        netWorkingCapitalLoanDrawdownTl: nwcDrawdown,
        netWorkingCapitalLoanRepaymentTl: nwcRepayment,
        netFinancingCashFlowTl: netFinancingCashFlow,
        cashOpeningTl: cashOpening,
        cashAdditionDisposalTl: cashAdditionDisposal,
        cashClosingTl: cashClosing,

        revenuesTl: revenues,
        operatingCostsTl: operatingCosts,
        changeInWorkingCapitalTl: changeInWc,
        netVatCashFlowTl: netVat,
        capexWaterfallTl: capexWf,
        operatingCashFlowBeforeTaxTl: opCfBeforeTax,
        corporateIncomeTaxPaidTl: corpTaxPaid,
        cfadsTl: cfads,

        netFcfcTl: netFcfc,
        discountedNetFcfcTl: discFcfc,
        cumulativeNetFcfcTl: cumFcfc,

        netFcfeTl: netFcfe,
        discountedNetFcfeTl: discFcfe,
        cumulativeNetFcfeTl: cumFcfe,

        dscr,
        co2OffsetKg: periodGen * CO2_INTENSITY_KG_PER_KWH,
      });
    }

    // Loan balance decrement (yıllık ortalama olarak takip)
    loanBalance = loanBalance - annualPrincipal;
  }

  // Yıllık agregat
  const yearly: PeriodFinance[] = [];
  for (let y = 1; y <= years; y++) {
    const months = monthly.filter((m) => m.year === y);
    yearly.push(aggregateYear(months, y));
  }

  // Toplamlar ve metrikler
  const totalRevenueTl = yearly.reduce((a, y) => a + y.salesRevenueTl, 0);
  const totalOpexTl = yearly.reduce((a, y) => a + (y.insuranceCostTl + y.correctiveMaintenanceTl + y.preventiveMaintenanceTl + y.totalPayrollTl + y.transmissionOperationalFeesTl + y.otherFeesTl), 0);

  // NPV/IRR FCFC ile (proje bakış açısı)
  const cashFlowsFcfc: number[] = [-totalCapexTl, ...yearly.map((y) => y.netFcfcTl)];
  const npvTl = cashFlowsFcfc.reduce((acc, cf, t) => acc + cf / Math.pow(1 + discountRate, t), 0);
  const irrPct = computeIRR(cashFlowsFcfc) * 100;
  const mirrPct = computeMIRR(cashFlowsFcfc, discountRate, discountRate) * 100;

  // LCOE
  const totalDiscountedCapexOpex =
    totalCapexTl + yearly.reduce((acc, y, i) => {
      const opexI = y.insuranceCostTl + y.correctiveMaintenanceTl + y.preventiveMaintenanceTl + y.totalPayrollTl + y.transmissionOperationalFeesTl + y.otherFeesTl;
      return acc + opexI / Math.pow(1 + discountRate, i + 1);
    }, 0);
  const totalDiscountedGeneration = yearly.reduce((acc, y, i) => acc + y.generationKwh / Math.pow(1 + discountRate, i + 1), 0);
  const lcoeTlKwh = totalDiscountedGeneration > 0 ? totalDiscountedCapexOpex / totalDiscountedGeneration : 0;

  // Payback metrikleri (FCFC + FCFE bazlı)
  const fcfcPaybackYears = computePaybackFromCumulative(yearly.map((y) => y.cumulativeNetFcfcTl));
  const fcfePaybackYears = computePaybackFromCumulative(yearly.map((y) => y.cumulativeNetFcfeTl));
  const simplePaybackYears = fcfcPaybackYears;
  const discountedPaybackYears = computePaybackFromCumulative(yearly.map((y, i) => sumDiscFcfcUpTo(yearly, i, discountRate, totalCapexTl)));

  const avgDscrCalc =
    yearly.filter((y) => y.dscr > 0).reduce((a, y) => a + y.dscr, 0) /
    Math.max(1, yearly.filter((y) => y.dscr > 0).length);

  const equity = totalCapexTl - loanSchedule.principal0;
  const totalNetIncome = yearly.reduce((a, y) => a + y.netIncomeTl, 0);
  const roePct = equity > 0 ? (totalNetIncome / equity / years) * 100 : 0;
  const roiPct = totalCapexTl > 0 ? ((totalRevenueTl - totalCapexTl - totalOpexTl) / totalCapexTl) * 100 : 0;

  const totalCo2Kg = yearly.reduce((a, y) => a + y.co2OffsetKg, 0);
  const totalCo2Tons = totalCo2Kg / 1000;
  const equivalentTrees = Math.round(totalCo2Tons * TREES_PER_TON_CO2);

  return {
    yearly,
    monthly,
    totalCapexTl,
    totalOpexTl,
    totalRevenueTl,
    npvTl,
    npvUsd: npvTl / config.fx.usdTry,
    irrPct,
    mirrPct,
    fcfcPaybackYears,
    fcfePaybackYears,
    simplePaybackYears,
    discountedPaybackYears,
    lcoeTlKwh,
    lcoeUsdKwh: lcoeTlKwh / config.fx.usdTry,
    roiPct,
    roePct,
    avgDscr: Number.isFinite(avgDscrCalc) ? avgDscrCalc : 0,
    totalCo2Tons,
    equivalentTrees,
  };
}

// ---------- Yardımcılar ----------

function monthlySharesFromHourly(generation: number[], consumption: number[], netting: NettingResult) {
  const out: Array<{ generation: number; consumption: number; netted: number; paidSurplus: number; yekdem: number }> = [];
  let cursor = 0;
  for (let m = 0; m < 12; m++) {
    const start = cursor;
    const end = cursor + DPM[m] * 24;
    cursor = end;
    let g = 0, c = 0, n = 0, p = 0, y = 0;
    for (let h = start; h < end; h++) {
      g += generation[h] || 0;
      c += consumption[h] || 0;
      n += netting.netted[h] || 0;
      p += netting.paidSurplus[h] || 0;
      y += netting.yekdemFree[h] || 0;
    }
    out.push({ generation: g, consumption: c, netted: n, paidSurplus: p, yekdem: y });
  }
  return out;
}

function annualSum(arr: number[]): number { return arr.reduce((a, b) => a + b, 0); }

function aggregateYear(months: PeriodFinance[], year: number): PeriodFinance {
  const sum = (k: keyof PeriodFinance) => months.reduce((a, m) => a + (Number(m[k]) || 0), 0);
  const last = months[months.length - 1];
  return {
    periodIndex: year,
    year,
    label: `Yıl ${year}`,
    generationKwh: sum('generationKwh'),
    consumptionKwh: sum('consumptionKwh'),
    nettedKwh: sum('nettedKwh'),
    paidSurplusKwh: sum('paidSurplusKwh'),
    yekdemFreeKwh: sum('yekdemFreeKwh'),
    salesRevenueTl: sum('salesRevenueTl'),
    scrappedEquipmentTl: sum('scrappedEquipmentTl'),
    netSalesTl: sum('netSalesTl'),
    transmissionOperationalFeesTl: sum('transmissionOperationalFeesTl'),
    otherFeesTl: sum('otherFeesTl'),
    grossProfitTl: sum('grossProfitTl'),
    insuranceCostTl: sum('insuranceCostTl'),
    correctiveMaintenanceTl: sum('correctiveMaintenanceTl'),
    preventiveMaintenanceTl: sum('preventiveMaintenanceTl'),
    totalPayrollTl: sum('totalPayrollTl'),
    ebitdaTl: sum('ebitdaTl'),
    depreciationTl: sum('depreciationTl'),
    ebitTl: sum('ebitTl'),
    fxGainLossTl: sum('fxGainLossTl'),
    interestExpenseTl: sum('interestExpenseTl'),
    earningsBeforeTaxTl: sum('earningsBeforeTaxTl'),
    fxGainLossAddbackTl: sum('fxGainLossAddbackTl'),
    taxExpenseTl: sum('taxExpenseTl'),
    netIncomeTl: sum('netIncomeTl'),
    cfRevenueTl: sum('cfRevenueTl'),
    cfAllInCostOfSalesTl: sum('cfAllInCostOfSalesTl'),
    owcRequirementTl: last?.owcRequirementTl ?? 0,
    changeInOwcTl: sum('changeInOwcTl'),
    corporateIncomeTaxCfTl: sum('corporateIncomeTaxCfTl'),
    vatCfTl: sum('vatCfTl'),
    netOperatingCashFlowTl: sum('netOperatingCashFlowTl'),
    capexCfTl: sum('capexCfTl'),
    netInvestingCashFlowTl: sum('netInvestingCashFlowTl'),
    drawdownTl: sum('drawdownTl'),
    repaymentTl: sum('repaymentTl'),
    interestExpenseCfTl: sum('interestExpenseCfTl'),
    commitmentFeeTl: sum('commitmentFeeTl'),
    arrangementFeeTl: sum('arrangementFeeTl'),
    equityTl: sum('equityTl'),
    additionalEquityToCureDscrTl: sum('additionalEquityToCureDscrTl'),
    netWorkingCapitalLoanDrawdownTl: sum('netWorkingCapitalLoanDrawdownTl'),
    netWorkingCapitalLoanRepaymentTl: sum('netWorkingCapitalLoanRepaymentTl'),
    netFinancingCashFlowTl: sum('netFinancingCashFlowTl'),
    cashOpeningTl: months[0]?.cashOpeningTl ?? 0,
    cashAdditionDisposalTl: sum('cashAdditionDisposalTl'),
    cashClosingTl: last?.cashClosingTl ?? 0,
    revenuesTl: sum('revenuesTl'),
    operatingCostsTl: sum('operatingCostsTl'),
    changeInWorkingCapitalTl: sum('changeInWorkingCapitalTl'),
    netVatCashFlowTl: sum('netVatCashFlowTl'),
    capexWaterfallTl: sum('capexWaterfallTl'),
    operatingCashFlowBeforeTaxTl: sum('operatingCashFlowBeforeTaxTl'),
    corporateIncomeTaxPaidTl: sum('corporateIncomeTaxPaidTl'),
    cfadsTl: sum('cfadsTl'),
    netFcfcTl: sum('netFcfcTl'),
    discountedNetFcfcTl: sum('discountedNetFcfcTl'),
    cumulativeNetFcfcTl: last?.cumulativeNetFcfcTl ?? 0,
    netFcfeTl: sum('netFcfeTl'),
    discountedNetFcfeTl: sum('discountedNetFcfeTl'),
    cumulativeNetFcfeTl: last?.cumulativeNetFcfeTl ?? 0,
    dscr: months.reduce((a, m) => a + m.dscr, 0) / Math.max(1, months.length),
    co2OffsetKg: sum('co2OffsetKg'),
  };
}

interface OpexBreakdown {
  insurance: number;
  corrective: number;
  preventive: number;
  payroll: number;
  systemUsage: number;
  spareParts: number;
  inverterReplacement: number;
  other: number;
}

function computeAnnualOpex(config: ProjectConfig, totalCapexTl: number, mul: number, year: number): { total: number; breakdown: OpexBreakdown } {
  const base = config.opex;
  const insurance = totalCapexTl * base.insurancePctCapex;
  const corrective = base.spareParts * mul * 0.4;
  const preventive = (base.omTlPerKwpYear * config.pv.peakPowerKwp) * mul * 0.6;
  const payroll = base.managementFees * mul;
  const systemUsage = (config.consumption.annualKwh / 12) * base.systemUsageTlKwh * 12; // basit
  const spareParts = base.spareParts * mul * 0.6;
  const inverterReplacement = year === base.inverterReplacementYear ? totalCapexTl * base.inverterReplacementPctCapex : 0;
  const other = base.security * mul + base.propertyTax * mul;
  const total = insurance + corrective + preventive + payroll + systemUsage + spareParts + inverterReplacement + other;
  return { total, breakdown: { insurance, corrective, preventive, payroll, systemUsage, spareParts, inverterReplacement, other } };
}

function computeAnnualFxGainLoss(config: ProjectConfig, totalCapexTl: number, yearIdx: number): number {
  // PPP-implied USD/TL artışı yıllık enflasyon farkı kadardır
  const trInf = config.fx.trInflationPct / 100;
  const usInf = config.fx.usInflationPct / 100;
  const fxDrift = (1 + trInf) / (1 + usInf) - 1;
  // USD pozisyonu (capex'in %50'si döviz cinsi varsayımı)
  const usdExposure = (totalCapexTl * 0.5) / config.fx.usdTry; // USD
  const tlPerUsdGrowth = config.fx.usdTry * fxDrift * Math.pow(1 + fxDrift, yearIdx);
  // Negatif değer = TL kayıp (USD borç var ise)
  return -usdExposure * tlPerUsdGrowth * 0.1; // skala
}

function leasingPayment(config: ProjectConfig, year: number): number {
  const monthly = config.financing.leasingMonthlyTl || 0;
  const termMonths = config.financing.leasingTermMonths || 0;
  const monthsInYear = Math.min(12, Math.max(0, termMonths - (year - 1) * 12));
  return monthly * monthsInYear;
}

function computeTotalCapex(config: ProjectConfig): number {
  const c = config.capex;
  return c.pvModule + c.inverter + c.mounting + c.cabling + c.labor + c.engineering + c.gridConnection + c.tedasZbof + c.land + c.insurance + c.contingency + c.battery;
}

function computeAugmentationCapex(config: ProjectConfig): Record<number, number> {
  const result: Record<number, number> = {};
  if (!config.battery.enabled || !config.battery.augmentationEnabled) return result;
  const baseTlPerKwh = config.battery.capexTlPerKwh;
  const declinePerEvent = config.battery.augmentationCapexDeclinePct;
  config.battery.augmentationYears.forEach((y, idx) => {
    const pricePerKwh = baseTlPerKwh * Math.pow(1 - declinePerEvent, idx + 1);
    const totalCost = config.battery.augmentationKwhPerEvent * pricePerKwh;
    result[y - 1] = (result[y - 1] || 0) + totalCost;
  });
  return result;
}

interface LoanSchedule {
  principal0: number;
  yearly: Array<{ interest: number; principal: number; endBalance: number }>;
}

function buildLoanSchedule(config: ProjectConfig, totalCapexTl: number): LoanSchedule {
  if (config.financing.type !== 'loan') return { principal0: 0, yearly: [] };
  const equityPct = config.financing.equityPct ?? 0.3;
  const loanPrincipal = totalCapexTl * (1 - equityPct);
  const termYears = config.financing.loanTermYears ?? 7;
  const annualRate = (config.financing.interestRatePctTl ?? 35) / 100;
  const repay = config.financing.repaymentType ?? 'annuity';
  const refi = config.financing.refinancing;

  const yearly: LoanSchedule['yearly'] = [];
  let balance = loanPrincipal;
  let currentRate = annualRate;
  let currentTermRemaining = termYears;

  const computeAnnuity = (bal: number, r: number, n: number) =>
    r === 0 ? bal / n : (bal * r) / (1 - Math.pow(1 + r, -n));

  let annuity = computeAnnuity(loanPrincipal, currentRate, currentTermRemaining);

  for (let y = 0; y < termYears * 3 && balance > 0.01; y++) {
    const yearOfLoan = y + 1; // 1-based

    // Refinansman tetiklemesi
    if (refi?.enabled && yearOfLoan === refi.yearN) {
      const refinanceFee = balance * (refi.refinancingFeePct / 100);
      currentRate = refi.newInterestRatePctTl / 100;
      currentTermRemaining = refi.newTermYears;
      annuity = computeAnnuity(balance, currentRate, currentTermRemaining);
      // Refinansman komisyonu o yılın faizine eklenir
      const interest = balance * currentRate + refinanceFee;
      const principal = Math.min(annuity - balance * currentRate, balance);
      balance -= principal;
      yearly.push({ interest, principal, endBalance: balance });
      continue;
    }

    if (repay === 'annuity') {
      const interest = balance * currentRate;
      const principal = Math.min(annuity - interest, balance);
      balance -= principal;
      yearly.push({ interest, principal, endBalance: balance });
    } else {
      const principalPerYear = loanPrincipal / termYears;
      const interest = balance * currentRate;
      const principal = Math.min(principalPerYear, balance);
      balance -= principal;
      yearly.push({ interest, principal, endBalance: balance });
    }
  }
  const analysisYears = config.analysisYears;
  while (yearly.length < analysisYears) yearly.push({ interest: 0, principal: 0, endBalance: 0 });
  return { principal0: loanPrincipal, yearly };
}

function computePaybackFromCumulative(cum: number[]): number {
  for (let i = 0; i < cum.length; i++) {
    if (cum[i] >= 0) {
      if (i === 0) return 1;
      const prev = cum[i - 1];
      const cur = cum[i];
      const fraction = -prev / (cur - prev);
      return i + fraction;
    }
  }
  return Infinity;
}

function sumDiscFcfcUpTo(yearly: PeriodFinance[], idx: number, rate: number, totalCapex: number): number {
  let s = -totalCapex;
  for (let t = 0; t <= idx; t++) {
    s += yearly[t].netFcfcTl / Math.pow(1 + rate, t + 1);
  }
  return s;
}

export function computeIRR(cashFlows: number[], guess = 0.1): number {
  if (cashFlows.length < 2) return NaN;
  const npv = (r: number) => cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + r, t), 0);
  const dnpv = (r: number) => cashFlows.reduce((acc, cf, t) => acc + (-t * cf) / Math.pow(1 + r, t + 1), 0);
  let r = guess;
  for (let i = 0; i < 100; i++) {
    const f = npv(r);
    if (Math.abs(f) < 1e-7) return r;
    const df = dnpv(r);
    if (df === 0 || !Number.isFinite(df)) break;
    const next = r - f / df;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - r) < 1e-9) return next;
    r = next;
    if (r <= -0.999) r = -0.99;
  }
  let lo = -0.99, hi = 10, fLo = npv(lo), fHi = npv(hi);
  if (fLo * fHi > 0) return r;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fMid * fLo < 0) { hi = mid; fHi = fMid; } else { lo = mid; fLo = fMid; }
  }
  return (lo + hi) / 2;
}

export function computeMIRR(cashFlows: number[], financeRate: number, reinvestRate: number): number {
  const n = cashFlows.length - 1;
  if (n < 1) return NaN;
  let pvNeg = 0, fvPos = 0;
  cashFlows.forEach((cf, t) => {
    if (cf < 0) pvNeg += cf / Math.pow(1 + financeRate, t);
    else fvPos += cf * Math.pow(1 + reinvestRate, n - t);
  });
  if (pvNeg === 0 || fvPos === 0) return NaN;
  return Math.pow(fvPos / -pvNeg, 1 / n) - 1;
}
