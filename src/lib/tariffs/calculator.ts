/**
 * Fatura Hesaplama Motoru — EPDK 14461 ve sonrası.
 *
 * Hesaplama sırası (PRD A.7):
 *   1. Brüt bedel = aktif enerji + dağıtım + iletim + piyasa işletim (TL)
 *   2. Enerji fonu  = Brüt × energyFundRate
 *   3. BTV          = Brüt × municipalTaxRate
 *   4. KDV matrahı  = Brüt + Fon + BTV
 *   5. KDV          = Matrah × vatRate
 *   6. Toplam       = Matrah + KDV
 */

import { TariffEntry, BillCalculationInput, BillBreakdown, ConsumerGroupV2, LastResortSupplyConfig, TouConsumption, SingleConsumption } from './schema';

export interface CalculatorContext {
  tariffs: TariffEntry[];
  skt: LastResortSupplyConfig;
  /** PTF + YEKDEM aylık ortalaması (TL/kWh) — SKTT hesabı için */
  ptfYekdemAvgTlKwh: number;
}

export function calculateBill(input: BillCalculationInput, ctx: CalculatorContext): BillBreakdown {
  const notes: string[] = [];
  const appliedEntries: string[] = [];

  // Tek zamanlı / üç zamanlı ayır
  let netEnergyTl = 0;
  let vatRate = 0;
  let municipalTaxRate = 0;
  let energyFundRate = 0;
  let sktApplied = false;

  // SKTT eşik kontrolü (mesken için)
  const annualKwh = input.annualConsumptionKwh ?? estimateAnnual(input.consumption);
  const sktThreshold = sktThresholdFor(input.consumerGroup, ctx.skt);

  if (annualKwh > sktThreshold) {
    sktApplied = true;
    notes.push(
      `Yıllık tüketim (${annualKwh.toLocaleString('tr-TR')} kWh) SKTT eşiğini (${sktThreshold.toLocaleString('tr-TR')} kWh) aşıyor; ` +
        `enerji bedeli (PTF+YEKDEM)×KBK formülüyle hesaplandı.`
    );
    const kbk = input.consumerGroup === 'residential' ? ctx.skt.residentialKbk : ctx.skt.otherKbk;
    const monthlyKwhTotal = totalMonthlyKwh(input.consumption);
    const sktEnergyTlKwh = ctx.ptfYekdemAvgTlKwh * kbk;

    // SKTT'de dağıtım/iletim/piyasa hala normal tarifeden alınır
    const referenceEntry = findFirstReference(input, ctx.tariffs);
    if (referenceEntry) {
      const overheadTlKwh =
        referenceEntry.distributionChargeTlKwh +
        referenceEntry.transmissionChargeTlKwh +
        referenceEntry.marketOperationChargeTlKwh +
        referenceEntry.lossChargeTlKwh;
      netEnergyTl = monthlyKwhTotal * (sktEnergyTlKwh + overheadTlKwh);
      vatRate = referenceEntry.vatRate;
      municipalTaxRate = referenceEntry.municipalTaxRate;
      energyFundRate = referenceEntry.energyFundRate;
      appliedEntries.push(`SKTT(${referenceEntry.id})`);
    }
  } else if (input.useTimeOfUse && input.consumption.kind === 'tou') {
    const tou = input.consumption;
    const day = pickTariff(input, ctx.tariffs, 'daytime');
    const peak = pickTariff(input, ctx.tariffs, 'peak');
    const night = pickTariff(input, ctx.tariffs, 'night');
    if (!day || !peak || !night) {
      throw new Error(
        `Üç zamanlı tarife bulunamadı: ${input.consumerGroup}/${input.voltageLevel}`
      );
    }
    netEnergyTl =
      tou.daytimeKwh * unitTlKwh(day) +
      tou.peakKwh * unitTlKwh(peak) +
      tou.nightKwh * unitTlKwh(night);
    vatRate = day.vatRate;
    municipalTaxRate = day.municipalTaxRate;
    energyFundRate = day.energyFundRate;
    appliedEntries.push(day.id, peak.id, night.id);
  } else if (input.consumption.kind === 'single') {
    const singleMonth = input.consumption.monthlyKwh;
    // Kademeli mi? Mesken/ticarethane için kademe eşiği uygulanır.
    const t1 = pickTariff(input, ctx.tariffs, 'single', 1);
    const t2 = pickTariff(input, ctx.tariffs, 'single', 2);
    const flat = pickTariff(input, ctx.tariffs, 'single', null);

    if (t1 && t2 && t1.tierUpperKwhPerMonth !== null) {
      const threshold = t1.tierUpperKwhPerMonth;
      const tier1Kwh = Math.min(singleMonth, threshold);
      const tier2Kwh = Math.max(0, singleMonth - threshold);
      netEnergyTl = tier1Kwh * unitTlKwh(t1) + tier2Kwh * unitTlKwh(t2);
      vatRate = t1.vatRate;
      municipalTaxRate = t1.municipalTaxRate;
      energyFundRate = t1.energyFundRate;
      appliedEntries.push(t1.id);
      if (tier2Kwh > 0) appliedEntries.push(t2.id);
    } else if (flat) {
      netEnergyTl = singleMonth * unitTlKwh(flat);
      vatRate = flat.vatRate;
      municipalTaxRate = flat.municipalTaxRate;
      energyFundRate = flat.energyFundRate;
      appliedEntries.push(flat.id);
    } else {
      throw new Error(`Tarife bulunamadı: ${input.consumerGroup}/${input.voltageLevel}`);
    }
  } else {
    throw new Error('Tüketim tipi tarife yapılandırmasıyla uyumsuz.');
  }

  // Vergiler
  const energyFundTl = netEnergyTl * energyFundRate;
  const municipalTaxTl = netEnergyTl * municipalTaxRate;
  const vatBaseTl = netEnergyTl + energyFundTl + municipalTaxTl;
  const vatTl = vatBaseTl * vatRate;
  const totalTl = vatBaseTl + vatTl;

  return {
    netEnergyTl: round2(netEnergyTl),
    energyFundTl: round2(energyFundTl),
    municipalTaxTl: round2(municipalTaxTl),
    vatBaseTl: round2(vatBaseTl),
    vatTl: round2(vatTl),
    totalTl: round2(totalTl),
    appliedEntries,
    sktApplied,
    notes,
  };
}

// ---------- Yardımcılar ----------

function unitTlKwh(t: TariffEntry): number {
  return (
    t.energyChargeTlKwh +
    t.distributionChargeTlKwh +
    t.transmissionChargeTlKwh +
    t.marketOperationChargeTlKwh +
    t.lossChargeTlKwh
  );
}

function pickTariff(
  input: BillCalculationInput,
  tariffs: TariffEntry[],
  period: 'single' | 'daytime' | 'peak' | 'night',
  tier?: 1 | 2 | null
): TariffEntry | undefined {
  return tariffs.find(
    (t) =>
      t.consumerGroup === input.consumerGroup &&
      t.voltageLevel === input.voltageLevel &&
      t.tariffPeriod === period &&
      (tier === undefined ? true : t.tier === tier)
  );
}

function findFirstReference(input: BillCalculationInput, tariffs: TariffEntry[]): TariffEntry | undefined {
  return (
    pickTariff(input, tariffs, 'single', 1) ??
    pickTariff(input, tariffs, 'single', null) ??
    pickTariff(input, tariffs, 'single', 2) ??
    pickTariff(input, tariffs, 'daytime')
  );
}

function sktThresholdFor(group: ConsumerGroupV2, skt: LastResortSupplyConfig): number {
  switch (group) {
    case 'residential': return skt.residentialThresholdKwhYearly;
    case 'agricultural': return skt.agriculturalThresholdKwhYearly;
    default: return skt.commercialIndustrialThresholdKwhYearly;
  }
}

function estimateAnnual(c: SingleConsumption | TouConsumption): number {
  return totalMonthlyKwh(c) * 12;
}

function totalMonthlyKwh(c: SingleConsumption | TouConsumption): number {
  if (c.kind === 'single') return c.monthlyKwh;
  return c.daytimeKwh + c.peakKwh + c.nightKwh;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
