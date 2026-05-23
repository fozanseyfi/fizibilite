/**
 * Excel rapor üretimi — PRD §11.2.
 * 11 sheet: Özet, Saatlik, Aylık, Yıllık, CAPEX, OPEX, Cash Flow, Kredi, Vergi, MC, Varsayımlar.
 */

import ExcelJS from 'exceljs';
import { ProjectConfig, SimulationResult } from '../types';
import { PROFILES } from '../consumption';

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export async function buildExcelReport(
  config: ProjectConfig,
  result: SimulationResult
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GES-Fizibilite Pro';
  wb.created = new Date();

  // ----- Sheet 1 — Özet -----
  const s1 = wb.addWorksheet('Özet');
  s1.columns = [{ width: 36 }, { width: 24 }];
  s1.addRows([
    ['GES-Fizibilite Pro — Yönetici Özeti', ''],
    ['Proje', config.name],
    ['Lokasyon', `${config.location.city ?? ''} (${config.location.lat.toFixed(4)}, ${config.location.lon.toFixed(4)})`],
    ['Kurulu Güç (kWp)', config.pv.peakPowerKwp],
    ['Yıllık Tüketim (kWh)', config.consumption.annualKwh],
    ['Analiz Süresi (yıl)', config.analysisYears],
    [],
    ['ANAHTAR METRİKLER', ''],
    ['Toplam CAPEX (TL)', result.finance.totalCapexTl],
    ['25 Yıllık Toplam Gelir (TL)', result.finance.totalRevenueTl],
    ['NPV (TL)', result.finance.npvTl],
    ['NPV (USD)', result.finance.npvUsd],
    ['IRR (%)', result.finance.irrPct],
    ['MIRR (%)', result.finance.mirrPct],
    ['FCFC Payback (yıl)', result.finance.fcfcPaybackYears],
    ['FCFE Payback (yıl)', result.finance.fcfePaybackYears],
    ['İskontolu Payback (yıl)', result.finance.discountedPaybackYears],
    ['LCOE (TL/kWh)', result.finance.lcoeTlKwh],
    ['LCOE (USD/kWh)', result.finance.lcoeUsdKwh],
    ['ROI (%)', result.finance.roiPct],
    ['ROE (%)', result.finance.roePct],
    ['Ortalama DSCR', result.finance.avgDscr],
    ['Toplam CO₂ Önleme (ton)', result.finance.totalCo2Tons],
    ['Eşdeğer Ağaç', result.finance.equivalentTrees],
  ]);
  s1.getRow(1).font = { bold: true, size: 14 };
  s1.getRow(8).font = { bold: true };

  // ----- Sheet 2 — Saatlik (1. yıl) -----
  const s2 = wb.addWorksheet('Saatlik Veri (Yıl 1)');
  s2.columns = [
    { header: 'Saat', key: 'h', width: 6 },
    { header: 'Üretim kWh', key: 'g', width: 14 },
    { header: 'Tüketim kWh', key: 'c', width: 14 },
    { header: 'Mahsup kWh', key: 'n', width: 14 },
    { header: 'Net Tüketim kWh', key: 'nc', width: 16 },
    { header: 'Fazla Üretim kWh', key: 's', width: 16 },
    { header: 'Bedelli Satış kWh', key: 'ps', width: 16 },
    { header: 'YEKDEM Bedelsiz kWh', key: 'y', width: 18 },
    { header: 'Batarya SOC %', key: 'soc', width: 14 },
    { header: 'Bat. Şarj kWh', key: 'ch', width: 14 },
    { header: 'Bat. Boşalt kWh', key: 'dis', width: 14 },
  ];
  const yr0 = 0;
  for (let h = 0; h < 8760; h++) {
    s2.addRow({
      h: h + 1,
      g: round(result.generationByYear[yr0][h], 4),
      c: round(result.consumptionByYear[yr0][h], 4),
      n: round(result.nettingByYear[yr0].netted[h], 4),
      nc: round(result.nettingByYear[yr0].netConsumption[h], 4),
      s: round(result.nettingByYear[yr0].surplusGeneration[h], 4),
      ps: round(result.nettingByYear[yr0].paidSurplus[h], 4),
      y: round(result.nettingByYear[yr0].yekdemFree[h], 4),
      soc: round((result.batteryByYear[yr0].soc[h] || 0) * 100, 2),
      ch: round(result.batteryByYear[yr0].charge[h], 4),
      dis: round(result.batteryByYear[yr0].discharge[h], 4),
    });
  }
  s2.getRow(1).font = { bold: true };

  // ----- Sheet 3 — Aylık Özet -----
  const s3 = wb.addWorksheet('Aylık Özet');
  s3.columns = [
    { header: 'Yıl', key: 'y', width: 8 },
    { header: 'Ay', key: 'm', width: 10 },
    { header: 'Üretim kWh', key: 'g', width: 14 },
    { header: 'Tüketim kWh', key: 'c', width: 14 },
    { header: 'Mahsup kWh', key: 'n', width: 14 },
    { header: 'Net Tüketim kWh', key: 'nc', width: 16 },
    { header: 'Fazla Üretim kWh', key: 's', width: 16 },
  ];
  const dpm = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (let y = 0; y < config.analysisYears; y++) {
    let cursor = 0;
    for (let m = 0; m < 12; m++) {
      const start = cursor;
      const end = cursor + dpm[m] * 24;
      cursor = end;
      let gen = 0, cons = 0, net = 0, nc = 0, surp = 0;
      for (let h = start; h < end; h++) {
        gen += result.generationByYear[y][h];
        cons += result.consumptionByYear[y][h];
        net += result.nettingByYear[y].netted[h];
        nc += result.nettingByYear[y].netConsumption[h];
        surp += result.nettingByYear[y].surplusGeneration[h];
      }
      s3.addRow({ y: y + 1, m: MONTH_NAMES[m], g: round(gen), c: round(cons), n: round(net), nc: round(nc), s: round(surp) });
    }
  }
  s3.getRow(1).font = { bold: true };

  // ----- Sheet 4 — Yıllık Özet (yeni PeriodFinance şeması) -----
  const s4 = wb.addWorksheet('Yıllık Özet');
  s4.columns = [
    { header: 'Yıl', key: 'y', width: 8 },
    { header: 'Üretim kWh', key: 'g', width: 16 },
    { header: 'Tüketim kWh', key: 'c', width: 16 },
    { header: 'Sales Revenue TL', key: 'rev', width: 22 },
    { header: 'Net Sales TL', key: 'net', width: 22 },
    { header: 'Gross Profit TL', key: 'gp', width: 22 },
    { header: 'EBITDA TL', key: 'ebitda', width: 18 },
    { header: 'EBIT TL', key: 'ebit', width: 18 },
    { header: 'Net Income TL', key: 'ni', width: 18 },
    { header: 'Net FCFC TL', key: 'fcfc', width: 18 },
    { header: 'Cum FCFC TL', key: 'cumfcfc', width: 18 },
    { header: 'Net FCFE TL', key: 'fcfe', width: 18 },
    { header: 'Cum FCFE TL', key: 'cumfcfe', width: 18 },
    { header: 'CFADS TL', key: 'cfads', width: 18 },
    { header: 'DSCR', key: 'dscr', width: 8 },
  ];
  for (const y of result.finance.yearly) {
    s4.addRow({
      y: y.year,
      g: round(y.generationKwh),
      c: round(y.consumptionKwh),
      rev: round(y.salesRevenueTl),
      net: round(y.netSalesTl),
      gp: round(y.grossProfitTl),
      ebitda: round(y.ebitdaTl),
      ebit: round(y.ebitTl),
      ni: round(y.netIncomeTl),
      fcfc: round(y.netFcfcTl),
      cumfcfc: round(y.cumulativeNetFcfcTl),
      fcfe: round(y.netFcfeTl),
      cumfcfe: round(y.cumulativeNetFcfeTl),
      cfads: round(y.cfadsTl),
      dscr: round(y.dscr, 2),
    });
  }
  s4.getRow(1).font = { bold: true };

  // ----- Sheet 4b — Aylık Cash Flow (Yıl 1) -----
  const s4b = wb.addWorksheet('Aylık Cash Flow (Yıl 1)');
  s4b.columns = [
    { header: 'Ay', key: 'm', width: 8 },
    { header: 'Sales Revenue', key: 'rev', width: 18 },
    { header: 'EBITDA', key: 'ebitda', width: 16 },
    { header: 'Net Income', key: 'ni', width: 16 },
    { header: 'Net Op CF', key: 'op', width: 16 },
    { header: 'Net Inv CF', key: 'inv', width: 16 },
    { header: 'Net Fin CF', key: 'fin', width: 16 },
    { header: 'Net FCFC', key: 'fcfc', width: 16 },
    { header: 'Net FCFE', key: 'fcfe', width: 16 },
    { header: 'CFADS', key: 'cfads', width: 16 },
    { header: 'DSCR', key: 'dscr', width: 8 },
  ];
  for (const m of result.finance.monthly.filter((x) => x.year === 1)) {
    s4b.addRow({
      m: m.label,
      rev: round(m.salesRevenueTl),
      ebitda: round(m.ebitdaTl),
      ni: round(m.netIncomeTl),
      op: round(m.netOperatingCashFlowTl),
      inv: round(m.netInvestingCashFlowTl),
      fin: round(m.netFinancingCashFlowTl),
      fcfc: round(m.netFcfcTl),
      fcfe: round(m.netFcfeTl),
      cfads: round(m.cfadsTl),
      dscr: round(m.dscr, 2),
    });
  }
  s4b.getRow(1).font = { bold: true };

  // ----- Sheet 5 — CAPEX Dökümü -----
  const s5 = wb.addWorksheet('CAPEX');
  s5.columns = [{ width: 28 }, { width: 18 }];
  s5.addRows([
    ['Kalem', 'TL'],
    ['PV Modül', config.capex.pvModule],
    ['İnvertör', config.capex.inverter],
    ['Montaj/Yapı', config.capex.mounting],
    ['Kablo & Pano', config.capex.cabling],
    ['İşçilik', config.capex.labor],
    ['Mühendislik', config.capex.engineering],
    ['Bağlantı Bedeli', config.capex.gridConnection],
    ['TEDAŞ + ZBÖF', config.capex.tedasZbof],
    ['İmar/Zemin', config.capex.land],
    ['Sigorta (CAR)', config.capex.insurance],
    ['Beklenmeyen', config.capex.contingency],
    ['Batarya', config.capex.battery],
    ['TOPLAM', config.capex.total],
  ]);
  s5.getRow(1).font = { bold: true };
  s5.lastRow!.font = { bold: true };

  // ----- Sheet 6 — OPEX 25 yıl -----
  const s6 = wb.addWorksheet('OPEX 25y');
  s6.columns = [
    { header: 'Yıl', key: 'y', width: 8 },
    { header: 'OPEX TL', key: 'op', width: 18 },
  ];
  for (const y of result.finance.yearly) s6.addRow({ y: y.year, op: round(y.opexTl) });
  s6.getRow(1).font = { bold: true };

  // ----- Sheet 7 — Cash Flow / P&L -----
  const s7 = wb.addWorksheet('Cash Flow P&L');
  s7.columns = [
    { header: 'Yıl', key: 'y', width: 8 },
    { header: 'Gelir', key: 'rev', width: 18 },
    { header: 'OPEX', key: 'opex', width: 18 },
    { header: 'EBITDA', key: 'ebitda', width: 18 },
    { header: 'Amortisman', key: 'am', width: 14 },
    { header: 'EBIT', key: 'ebit', width: 18 },
    { header: 'Faiz', key: 'int', width: 14 },
    { header: 'Vergi Öncesi', key: 'pretax', width: 16 },
    { header: 'Vergi', key: 'tax', width: 14 },
    { header: 'Net Gelir', key: 'ni', width: 18 },
  ];
  for (const y of result.finance.yearly) {
    s7.addRow({
      y: y.year, rev: round(y.totalRevenueTl), opex: round(y.opexTl), ebitda: round(y.ebitdaTl),
      am: round(y.amortizationTl), ebit: round(y.ebitTl), int: round(y.interestExpenseTl),
      pretax: round(y.taxableIncomeTl), tax: round(y.taxTl), ni: round(y.netIncomeTl),
    });
  }
  s7.getRow(1).font = { bold: true };

  // ----- Sheet 8 — Kredi -----
  if (config.financing.type === 'loan') {
    const s8 = wb.addWorksheet('Kredi Geri Ödeme');
    s8.columns = [
      { header: 'Yıl', key: 'y', width: 8 },
      { header: 'Faiz TL', key: 'i', width: 18 },
      { header: 'Anapara TL', key: 'p', width: 18 },
      { header: 'Bakiye TL', key: 'b', width: 18 },
    ];
    for (const y of result.finance.yearly) {
      s8.addRow({ y: y.year, i: round(y.interestExpenseTl), p: round(y.principalPaymentTl), b: round(y.loanBalanceTl) });
    }
    s8.getRow(1).font = { bold: true };
  }

  // ----- Sheet 9 — Vergi -----
  const s9 = wb.addWorksheet('Vergi');
  s9.columns = [{ width: 28 }, { width: 18 }];
  s9.addRows([
    ['KDV (%)', config.tax.vatPct * 100],
    ['KDV İadesi', config.tax.vatRefundEnabled ? 'Evet' : 'Hayır'],
    ['Kurumlar Vergisi (%)', config.tax.corporateTaxPct * 100],
    ['Amortisman Yıl', config.tax.amortizationYears],
    ['Yatırım Teşvik Belgesi', config.tax.investmentIncentiveEnabled ? 'Evet' : 'Hayır'],
    ['Bölge', config.tax.incentiveRegion],
    ['Vergi İndirimi (%)', config.tax.incentiveCorpTaxReductionPct * 100],
  ]);

  // ----- Sheet 10 — Monte Carlo -----
  if (result.monteCarlo) {
    const s10 = wb.addWorksheet('Monte Carlo');
    s10.columns = [
      { header: 'Iterasyon', key: 'i', width: 12 },
      { header: 'IRR %', key: 'irr', width: 12 },
      { header: 'NPV TL', key: 'npv', width: 18 },
      { header: 'Payback yıl', key: 'pb', width: 14 },
    ];
    result.monteCarlo.samples.forEach((s, i) => {
      s10.addRow({ i: i + 1, irr: round(s.irr, 2), npv: round(s.npv), pb: round(s.payback, 2) });
    });
    s10.getRow(1).font = { bold: true };
    s10.addRow([]);
    s10.addRow(['P10 IRR', result.monteCarlo.irr.p10]);
    s10.addRow(['P50 IRR', result.monteCarlo.irr.p50]);
    s10.addRow(['P90 IRR', result.monteCarlo.irr.p90]);
    s10.addRow(['NPV>0 olasılığı', result.monteCarlo.probabilityNpvPositive]);
  }

  // ----- Sheet 11 — Varsayımlar -----
  const s11 = wb.addWorksheet('Varsayımlar');
  s11.columns = [{ width: 32 }, { width: 32 }];
  s11.addRows([
    ['Tüketim Profili', PROFILES[config.consumption.profileId]?.label ?? config.consumption.profileId],
    ['Yıllık Tüketim Büyümesi (%)', config.consumption.growthRatePct],
    ['Önceki Yıl Tüketim (kWh)', config.consumption.prevYearKwh],
    ['Elektrik Fiyat Artışı (%)', config.tariff.electricityInflationPct],
    ['TL Enflasyon (%)', config.fx.trInflationPct],
    ['USD Kuru', config.fx.usdTry],
    ['Panel Degradasyon (%)', config.pv.annualDegradationPct * 100],
    ['Sistem Kaybı (%)', config.pv.loss],
    ['Eğim °', config.pv.angle],
    ['Azimut °', config.pv.aspect],
    ['Discount Rate (%)', config.financing.discountRatePct],
    ['Finansman Tipi', config.financing.type],
  ]);
  s11.addRow([]);
  s11.addRow(['Yasal dayanak', 'EPDK Karar No: 14531 (30.04.2026)']);
  s11.addRow(['Disclaimer', 'Bu rapor öneri niteliğindedir; yatırım kararı için uzman görüşü alınız.']);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

function round(n: number, dp = 2): number {
  if (!Number.isFinite(n)) return 0;
  const m = Math.pow(10, dp);
  return Math.round(n * m) / m;
}
