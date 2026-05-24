/**
 * Default config builder + 3 demo proje (PRD §15.5).
 */

import {
  ProjectConfig,
  Location,
  ConsumerGroup,
  ProjectType,
  CapexBreakdown,
} from './types';

export function buildDefaultConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  const peakPowerKwp = overrides.pv?.peakPowerKwp ?? 500;
  const usdTry = overrides.fx?.usdTry ?? 45.5; // TCMB Mayıs 2026 ortalaması
  const capex = overrides.capex ?? buildDefaultCapex(peakPowerKwp, 'rooftop_ci', usdTry, false);

  return {
    name: 'Yeni Proje',
    description: '',
    projectType: 'rooftop_ci',
    location: { lat: 36.8969, lon: 30.7133, city: 'Antalya' },
    pv: {
      peakPowerKwp,
      loss: 14,
      angle: 30,
      aspect: 0,
      moduleTech: 'crystSi',
      mounting: 'building',
      tracking: 0,
      lidPct: 0.02,
      annualDegradationPct: 0.005,
      losses: {
        soilingPct: 2.0, iamPct: 2.0, spectralPct: 0.5, temperaturePct: 5.0,
        mismatchPct: 1.0, dcCablingPct: 1.0, inverterPct: 2.0, acCablingPct: 1.0,
        transformerPct: 1.0, availabilityPct: 0.5,
      },
    },
    consumption: {
      profileId: 'office_5x10',
      annualKwh: 800_000,
      growthRatePct: 0,
      prevYearKwh: 800_000,
      sameMeteringPoint: false,
      builder: {
        daily: { slot_00_06: 5, slot_06_10: 20, slot_10_14: 30, slot_14_18: 30, slot_18_24: 15 },
        monthly: [8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.37],
        weekendFactor: 0.3,
      },
    },
    tariff: {
      consumerGroup: 'TICARETHANE_LV',
      purchasePriceTlKwh: 4.28,
      salePriceTlKwh: 3.95,
      hasBilateralContract: false,
      bilateralPriceTlKwh: null,
      isLastResortSupply: false,
      lastResortMultiplier: 1.0938,
      distributionFeeTlKwh: 0.95,
      consumptionTaxPct: 0.05,
      vatPct: 0.2,
      electricityInflationPct: 30,
    },
    battery: {
      enabled: false,
      nominalCapacityKwh: 0,
      nominalPowerKw: 0,
      roundTripEfficiency: 0.92,
      minSocPct: 0.1,
      maxSocPct: 0.95,
      initialSocPct: 0.5,
      cycleLifeAt80Dod: 6000,
      calendarLifeYears: 15,
      eolCapacityPct: 0.7,
      capexTlPerKwh: 8500,
      capexTlPerKw: 3500,
      bosTl: 0,
      augmentationEnabled: true,
      augmentationYears: [8, 16],
      augmentationKwhPerEvent: 0,
      augmentationCapexDeclinePct: 0.5,
      dispatchStrategy: 'rule_based',
      enableArbitrage: false,
      enablePeakShaving: false,
      peakThresholdKw: 0,
      arbitrageLowThresholdTlKwh: 1.5,
      arbitrageHighThresholdTlKwh: 5.0,
    },
    capex,
    opex: {
      omTlPerKwpYear: 120,
      insurancePctCapex: 0.005,
      inverterReplacementPctCapex: 0.08,
      inverterReplacementYear: 12,
      spareParts: peakPowerKwp * 30,
      security: 0,
      systemUsageTlKwh: 0.08,
      propertyTax: 0,
      managementFees: 25_000,
    },
    financing: {
      type: 'equity',
      equityPct: 1.0,
      loanTermYears: 7,
      interestRatePctTl: 35,
      interestRatePctUsd: 10,
      graceMonths: 0,
      repaymentType: 'annuity',
      discountRatePct: 18,
      construction: {
        monthsToCod: 6,
        curveType: 'realistic',
        commitmentFeeRate: 0.005,
        arrangementFeePct: 0.01,
        capitalizeIdc: true,
      },
    },
    tax: {
      vatPct: 0.2,
      vatRefundEnabled: true,
      corporateTaxPct: 0.25,
      amortizationYears: 10,
      investmentIncentiveEnabled: false,
      incentiveRegion: 1,
      incentiveCorpTaxReductionPct: 0,
    },
    fx: {
      usdTry,
      trInflationPct: 28, // TCMB Ocak 2026 raporu orta tahmin
      usInflationPct: 2.5,
      fxProjection: 'ppp',
    },
    monteCarlo: {
      enabled: true,
      iterations: 1000,
      seed: 42,
      generationSigmaPct: 0.05,
      consumptionGrowthSigmaPct: 0.02,
      electricityInflationTriangular: [0.25, 0.3, 0.4],
      trInflationTriangular: [0.2, 0.3, 0.45],
      fxAnnualVolPct: 0.18,
      degradationSigmaPct: 0.001,
      cycleLifeSigmaPct: 0.1,
      omSigmaPct: 0.1,
      capexOverrunTriangular: [0, 0, 0.2],
    },
    analysisYears: 25,
    ppa: {
      enabled: false,
      ppaPriceTlKwh: 4.5,
      ppaTermYears: 10,
      ppaEscalationPct: 2,
      scope: 'surplus_only',
    },
    carbonCredit: {
      enabled: false,
      standard: 'VCS',
      pricePerTonUsd: 12, // VCS solar tipik 2026: $8-15/tCO2e
      certificationCostUsdYearly: 8000,
      creditingPeriodYears: 10,
    },
    scenarioMatrixInputs: {
      capexUsdPerWp: {
        fixed_mono: 0.48,          // Base: PV+inv+mount+kablo+işçilik+müh = ~0.42, +bağlantı+sigorta+beklenmeyen = 0.48
        fixed_bifacial: 0.52,      // +%8 modül premium
        tracker_mono: 0.62,        // +%30 tracker yapı + motorizasyon
        tracker_bifacial: 0.66,    // ikisi birlikte
        tilted_mono: 0.50,         // ayarlı tilt yapı
        tilted_bifacial: 0.54,
      },
      opexTlPerKwpYear: {
        fixed_mono: 120,
        fixed_bifacial: 125,
        tracker_mono: 165,         // tracker bakım ekstra (~%40 daha pahalı)
        tracker_bifacial: 170,
        tilted_mono: 130,
        tilted_bifacial: 135,
      },
      batteryCapexTlPerKwh: 8500,
      enabledStructures: ['fixed_mono', 'tracker_mono'], // varsayılan: en yaygın 2 yapı
      enabledDcAcRatios: [1.1, 1.2, 1.3],                // 3 ortak DC/AC
      enabledBatteryRatios: [0, 0.5],                    // bataryasız + orta boyut
    },
    ...overrides,
  };
}

export function buildDefaultCapex(
  kWp: number,
  type: ProjectType,
  usdTry: number,
  withBattery: boolean
): CapexBreakdown {
  // USD/Wp default kalemler (PRD §7.1)
  const moduleUsd = 0.18;
  const inverterUsd = 0.06;
  const mountingUsd = type === 'ground_mount' ? 0.12 : 0.08;
  const cablingUsd = 0.04;
  const laborUsd = 0.05;
  const engineeringUsd = 0.03;

  const toTl = (usd: number) => usd * kWp * 1000 * usdTry;

  const pvModule = toTl(moduleUsd);
  const inverter = toTl(inverterUsd);
  const mounting = toTl(mountingUsd);
  const cabling = toTl(cablingUsd);
  const labor = toTl(laborUsd);
  const engineering = toTl(engineeringUsd);
  const gridConnection = kWp * 200; // 200 TL/kWp tahmini
  const tedasZbof = kWp * 150;
  const land = type === 'ground_mount' ? kWp * 600 : 0;
  const baseSum = pvModule + inverter + mounting + cabling + labor + engineering + gridConnection + tedasZbof + land;
  const insurance = baseSum * 0.01;
  const contingency = baseSum * 0.04;
  const battery = withBattery ? 0 : 0; // wizard'da hesaplanır

  return {
    pvModule,
    inverter,
    mounting,
    cabling,
    labor,
    engineering,
    gridConnection,
    tedasZbof,
    land,
    insurance,
    contingency,
    battery,
    total: baseSum + insurance + contingency + battery,
  };
}

// ---------- 9 demo proje ----------

export const DEMO_PROJECTS: Array<{ id: string; name: string; config: ProjectConfig }> = [
  {
    id: 'demo-antalya-otel',
    name: 'Antalya 500 kWp Otel Çatı GES',
    config: buildDefaultConfig({
      name: 'Antalya 500 kWp Otel Çatı GES',
      description: 'Side\'da 4 yıldızlı otel için çatı GES fizibilitesi',
      projectType: 'rooftop_ci',
      location: { lat: 36.7669, lon: 31.3895, city: 'Antalya', region: 'Side' },
      pv: {
        peakPowerKwp: 500, loss: 14, angle: 25, aspect: 0,
        moduleTech: 'crystSi', mounting: 'building', tracking: 0,
        lidPct: 0.02, annualDegradationPct: 0.005,
      },
      consumption: {
        profileId: 'hotel', annualKwh: 1_350_000, growthRatePct: 2,
        prevYearKwh: 1_350_000, sameMeteringPoint: false,
      },
      tariff: {
        consumerGroup: 'TICARETHANE_LV' as ConsumerGroup,
        purchasePriceTlKwh: 4.28, salePriceTlKwh: 3.95,
        hasBilateralContract: false, bilateralPriceTlKwh: null,
        isLastResortSupply: false, lastResortMultiplier: 1.0938,
        distributionFeeTlKwh: 0.95, consumptionTaxPct: 0.05, vatPct: 0.2,
        electricityInflationPct: 28,
      },
    }),
  },
  {
    id: 'demo-konya-arazi',
    name: 'Konya 4.9 MW Arazi GES (Lisanssız)',
    config: buildDefaultConfig({
      name: 'Konya 4.9 MW Arazi GES (Lisanssız)',
      description: 'Karapınar bölgesi tüzel kişi lisanssız arazi GES',
      projectType: 'ground_mount',
      location: { lat: 37.7167, lon: 33.55, city: 'Konya', region: 'Karapınar' },
      pv: {
        peakPowerKwp: 4900, loss: 14, angle: 32, aspect: 0,
        moduleTech: 'crystSi', mounting: 'free', tracking: 0,
        lidPct: 0.02, annualDegradationPct: 0.005,
      },
      consumption: {
        profileId: 'factory_3shift', annualKwh: 12_000_000, growthRatePct: 3,
        prevYearKwh: 12_000_000, sameMeteringPoint: false,
      },
      tariff: {
        consumerGroup: 'SANAYI_MV' as ConsumerGroup,
        purchasePriceTlKwh: 3.58, salePriceTlKwh: 3.20,
        hasBilateralContract: true, bilateralPriceTlKwh: 3.20,
        isLastResortSupply: false, lastResortMultiplier: 1.0938,
        distributionFeeTlKwh: 0.45, consumptionTaxPct: 0.01, vatPct: 0.2,
        electricityInflationPct: 28,
      },
      financing: {
        type: 'loan', equityPct: 0.3, loanTermYears: 8,
        interestRatePctTl: 38, interestRatePctUsd: 10,
        graceMonths: 12, repaymentType: 'annuity', discountRatePct: 22,
      },
    }),
  },
  {
    id: 'demo-izmir-hibrit',
    name: 'İzmir 1 MWp + 2 MWh BESS Hibrit Fabrika',
    config: buildDefaultConfig({
      name: 'İzmir 1 MWp + 2 MWh BESS Hibrit Fabrika',
      description: 'Çiğli OSB metal işleme tesisi, çatı GES + lityum BESS',
      projectType: 'hybrid_bess',
      location: { lat: 38.4192, lon: 27.1287, city: 'İzmir', region: 'Çiğli OSB' },
      pv: {
        peakPowerKwp: 1000, loss: 14, angle: 28, aspect: 0,
        moduleTech: 'crystSi', mounting: 'building', tracking: 0,
        lidPct: 0.02, annualDegradationPct: 0.005,
      },
      consumption: {
        profileId: 'factory_2shift', annualKwh: 3_800_000, growthRatePct: 4,
        prevYearKwh: 3_800_000, sameMeteringPoint: false,
      },
      tariff: {
        consumerGroup: 'SANAYI_LV' as ConsumerGroup,
        purchasePriceTlKwh: 4.05, salePriceTlKwh: 3.70,
        hasBilateralContract: false, bilateralPriceTlKwh: null,
        isLastResortSupply: false, lastResortMultiplier: 1.0938,
        distributionFeeTlKwh: 0.87, consumptionTaxPct: 0.01, vatPct: 0.2,
        electricityInflationPct: 28,
      },
      battery: {
        enabled: true, nominalCapacityKwh: 2000, nominalPowerKw: 500,
        roundTripEfficiency: 0.92, minSocPct: 0.1, maxSocPct: 0.95,
        initialSocPct: 0.5, cycleLifeAt80Dod: 6000, calendarLifeYears: 15,
        eolCapacityPct: 0.7, capexTlPerKwh: 8500, capexTlPerKw: 3500,
        bosTl: 250_000, augmentationEnabled: true, augmentationYears: [8, 16],
        augmentationKwhPerEvent: 400, augmentationCapexDeclinePct: 0.5,
        dispatchStrategy: 'rule_based', enableArbitrage: false,
        enablePeakShaving: true, peakThresholdKw: 400,
        arbitrageLowThresholdTlKwh: 1.5, arbitrageHighThresholdTlKwh: 5.0,
      },
    }),
  },

  // ---------- Kullanıcı talebi: 6 yeni demo ----------

  {
    id: 'demo-rooftop-1mw',
    name: '1 MWp Çatı GES (Sanayi)',
    config: buildDefaultConfig({
      name: '1 MWp Çatı GES (Sanayi)',
      description: 'Bursa OSB metal işleme fabrikası, çatı GES bataryasız',
      projectType: 'rooftop_ci',
      location: { lat: 40.1885, lon: 29.0610, city: 'Bursa', region: 'NOSAB' },
      pv: {
        peakPowerKwp: 1000, loss: 14, angle: 28, aspect: 0,
        moduleTech: 'crystSi', mounting: 'building', tracking: 0,
        lidPct: 0.02, annualDegradationPct: 0.005,
        losses: { soilingPct: 2.0, iamPct: 2.0, spectralPct: 0.5, temperaturePct: 5.0, mismatchPct: 1.0, dcCablingPct: 1.0, inverterPct: 2.0, acCablingPct: 1.0, transformerPct: 1.0, availabilityPct: 0.5 },
      },
      consumption: {
        profileId: 'factory_2shift', annualKwh: 3_500_000, growthRatePct: 3,
        prevYearKwh: 3_400_000, sameMeteringPoint: false,
      },
      tariff: {
        consumerGroup: 'SANAYI_LV' as ConsumerGroup,
        purchasePriceTlKwh: 4.05, salePriceTlKwh: 3.70,
        hasBilateralContract: false, bilateralPriceTlKwh: null,
        isLastResortSupply: false, lastResortMultiplier: 1.0938,
        distributionFeeTlKwh: 0.87, consumptionTaxPct: 0.01, vatPct: 0.2,
        electricityInflationPct: 28,
      },
    }),
  },

  {
    id: 'demo-rooftop-1mw-bess',
    name: '1 MWp Çatı GES + 1 MWh BESS (Sanayi)',
    config: buildDefaultConfig({
      name: '1 MWp Çatı GES + 1 MWh BESS (Sanayi)',
      description: 'Bursa OSB metal işleme fabrikası, çatı GES + LFP batarya peak shaving',
      projectType: 'hybrid_bess',
      location: { lat: 40.1885, lon: 29.0610, city: 'Bursa', region: 'NOSAB' },
      pv: {
        peakPowerKwp: 1000, loss: 14, angle: 28, aspect: 0,
        moduleTech: 'crystSi', mounting: 'building', tracking: 0,
        lidPct: 0.02, annualDegradationPct: 0.005,
        losses: { soilingPct: 2.0, iamPct: 2.0, spectralPct: 0.5, temperaturePct: 5.0, mismatchPct: 1.0, dcCablingPct: 1.0, inverterPct: 2.0, acCablingPct: 1.0, transformerPct: 1.0, availabilityPct: 0.5 },
      },
      consumption: {
        profileId: 'factory_2shift', annualKwh: 3_500_000, growthRatePct: 3,
        prevYearKwh: 3_400_000, sameMeteringPoint: false,
      },
      tariff: {
        consumerGroup: 'SANAYI_LV' as ConsumerGroup,
        purchasePriceTlKwh: 4.05, salePriceTlKwh: 3.70,
        hasBilateralContract: false, bilateralPriceTlKwh: null,
        isLastResortSupply: false, lastResortMultiplier: 1.0938,
        distributionFeeTlKwh: 0.87, consumptionTaxPct: 0.01, vatPct: 0.2,
        electricityInflationPct: 28,
      },
      battery: {
        enabled: true, nominalCapacityKwh: 1000, nominalPowerKw: 250,
        roundTripEfficiency: 0.92, minSocPct: 0.1, maxSocPct: 0.95,
        initialSocPct: 0.5, cycleLifeAt80Dod: 6000, calendarLifeYears: 15,
        eolCapacityPct: 0.7, capexTlPerKwh: 8500, capexTlPerKw: 3500,
        bosTl: 200_000, augmentationEnabled: true, augmentationYears: [8, 16],
        augmentationKwhPerEvent: 200, augmentationCapexDeclinePct: 0.5,
        dispatchStrategy: 'rule_based', enableArbitrage: false,
        enablePeakShaving: true, peakThresholdKw: 400,
        arbitrageLowThresholdTlKwh: 1.5, arbitrageHighThresholdTlKwh: 5.0,
      },
    }),
  },

  {
    id: 'demo-ground-10mw',
    name: '10 MWp Arazi GES (Lisanslı, Sanayi OG)',
    config: buildDefaultConfig({
      name: '10 MWp Arazi GES (Lisanslı, Sanayi OG)',
      description: 'Konya Karapınar — 10 MWp tracker arazi GES, sanayi OG bilateral PPA',
      projectType: 'ground_mount',
      location: { lat: 37.7167, lon: 33.55, city: 'Konya', region: 'Karapınar' },
      pv: {
        peakPowerKwp: 10_000, loss: 14, angle: 32, aspect: 0,
        moduleTech: 'crystSi', mounting: 'free', tracking: 1,
        lidPct: 0.02, annualDegradationPct: 0.005,
        losses: { soilingPct: 3.0, iamPct: 2.0, spectralPct: 0.5, temperaturePct: 6.0, mismatchPct: 1.0, dcCablingPct: 1.5, inverterPct: 2.0, acCablingPct: 1.0, transformerPct: 1.5, availabilityPct: 0.5 },
      },
      consumption: {
        profileId: 'factory_3shift', annualKwh: 25_000_000, growthRatePct: 3,
        prevYearKwh: 24_500_000, sameMeteringPoint: false,
      },
      tariff: {
        consumerGroup: 'SANAYI_MV' as ConsumerGroup,
        purchasePriceTlKwh: 3.58, salePriceTlKwh: 3.20,
        hasBilateralContract: true, bilateralPriceTlKwh: 3.20,
        isLastResortSupply: false, lastResortMultiplier: 1.0938,
        distributionFeeTlKwh: 0.45, consumptionTaxPct: 0.01, vatPct: 0.2,
        electricityInflationPct: 28,
      },
      financing: {
        type: 'loan', equityPct: 0.3, loanTermYears: 10,
        interestRatePctTl: 35, interestRatePctUsd: 9,
        graceMonths: 12, repaymentType: 'annuity', discountRatePct: 20,
        construction: { monthsToCod: 9, curveType: 'realistic', commitmentFeeRate: 0.005, arrangementFeePct: 0.01, capitalizeIdc: true },
      },
    }),
  },

  {
    id: 'demo-ground-10mw-bess',
    name: '10 MWp Arazi GES + 10 MWh BESS',
    config: buildDefaultConfig({
      name: '10 MWp Arazi GES + 10 MWh BESS',
      description: 'Konya Karapınar — 10 MWp arazi + 10 MWh LFP batarya, PTF arbitraj + peak shaving',
      projectType: 'hybrid_bess',
      location: { lat: 37.7167, lon: 33.55, city: 'Konya', region: 'Karapınar' },
      pv: {
        peakPowerKwp: 10_000, loss: 14, angle: 32, aspect: 0,
        moduleTech: 'crystSi', mounting: 'free', tracking: 1,
        lidPct: 0.02, annualDegradationPct: 0.005,
        losses: { soilingPct: 3.0, iamPct: 2.0, spectralPct: 0.5, temperaturePct: 6.0, mismatchPct: 1.0, dcCablingPct: 1.5, inverterPct: 2.0, acCablingPct: 1.0, transformerPct: 1.5, availabilityPct: 0.5 },
      },
      consumption: {
        profileId: 'factory_3shift', annualKwh: 25_000_000, growthRatePct: 3,
        prevYearKwh: 24_500_000, sameMeteringPoint: false,
      },
      tariff: {
        consumerGroup: 'SANAYI_MV' as ConsumerGroup,
        purchasePriceTlKwh: 3.58, salePriceTlKwh: 3.20,
        hasBilateralContract: true, bilateralPriceTlKwh: 3.20,
        isLastResortSupply: false, lastResortMultiplier: 1.0938,
        distributionFeeTlKwh: 0.45, consumptionTaxPct: 0.01, vatPct: 0.2,
        electricityInflationPct: 28,
      },
      battery: {
        enabled: true, nominalCapacityKwh: 10_000, nominalPowerKw: 2500,
        roundTripEfficiency: 0.92, minSocPct: 0.1, maxSocPct: 0.95,
        initialSocPct: 0.5, cycleLifeAt80Dod: 6000, calendarLifeYears: 15,
        eolCapacityPct: 0.7, capexTlPerKwh: 8500, capexTlPerKw: 3500,
        bosTl: 1_500_000, augmentationEnabled: true, augmentationYears: [8, 16],
        augmentationKwhPerEvent: 2000, augmentationCapexDeclinePct: 0.5,
        dispatchStrategy: 'rule_based', enableArbitrage: true,
        enablePeakShaving: true, peakThresholdKw: 3000,
        arbitrageLowThresholdTlKwh: 1.5, arbitrageHighThresholdTlKwh: 5.0,
      },
      financing: {
        type: 'loan', equityPct: 0.3, loanTermYears: 10,
        interestRatePctTl: 35, interestRatePctUsd: 9,
        graceMonths: 12, repaymentType: 'annuity', discountRatePct: 20,
        construction: { monthsToCod: 12, curveType: 'realistic', commitmentFeeRate: 0.005, arrangementFeePct: 0.01, capitalizeIdc: true },
      },
    }),
  },

  {
    id: 'demo-ground-50mw',
    name: '50 MWp Utility-Scale Arazi GES',
    config: buildDefaultConfig({
      name: '50 MWp Utility-Scale Arazi GES',
      description: 'Şanlıurfa — 50 MWp utility-scale tracker GES, kurumsal PPA + banka kredisi',
      projectType: 'ground_mount',
      location: { lat: 37.1591, lon: 38.7969, city: 'Şanlıurfa', region: 'Suruç' },
      pv: {
        peakPowerKwp: 50_000, loss: 14, angle: 30, aspect: 0,
        moduleTech: 'crystSi', mounting: 'free', tracking: 1,
        lidPct: 0.02, annualDegradationPct: 0.0045,
        losses: { soilingPct: 3.5, iamPct: 2.0, spectralPct: 0.5, temperaturePct: 6.5, mismatchPct: 1.0, dcCablingPct: 1.5, inverterPct: 1.8, acCablingPct: 1.0, transformerPct: 1.5, availabilityPct: 0.5 },
      },
      consumption: {
        profileId: 'factory_3shift', annualKwh: 100_000_000, growthRatePct: 2,
        prevYearKwh: 98_000_000, sameMeteringPoint: false,
      },
      tariff: {
        consumerGroup: 'SANAYI_MV' as ConsumerGroup,
        purchasePriceTlKwh: 3.58, salePriceTlKwh: 3.20,
        hasBilateralContract: true, bilateralPriceTlKwh: 3.20,
        isLastResortSupply: false, lastResortMultiplier: 1.0938,
        distributionFeeTlKwh: 0.45, consumptionTaxPct: 0.01, vatPct: 0.2,
        electricityInflationPct: 28,
      },
      ppa: {
        enabled: true,
        ppaPriceTlKwh: 4.20,
        ppaTermYears: 15,
        ppaEscalationPct: 2.5,
        scope: 'surplus_only',
        counterpartyName: 'Kurumsal Offtaker (örnek)',
      },
      financing: {
        type: 'loan', equityPct: 0.25, loanTermYears: 12,
        interestRatePctTl: 32, interestRatePctUsd: 8.5,
        graceMonths: 18, repaymentType: 'annuity', discountRatePct: 18,
        construction: { monthsToCod: 15, curveType: 'realistic', commitmentFeeRate: 0.005, arrangementFeePct: 0.0125, capitalizeIdc: true },
      },
    }),
  },

  {
    id: 'demo-ground-50mw-bess',
    name: '50 MWp Utility-Scale Arazi GES + 50 MWh BESS',
    config: buildDefaultConfig({
      name: '50 MWp Utility-Scale Arazi GES + 50 MWh BESS',
      description: 'Şanlıurfa — 50 MWp + 50 MWh BESS hybrid, dispatch + arbitraj + peak shaving',
      projectType: 'hybrid_bess',
      location: { lat: 37.1591, lon: 38.7969, city: 'Şanlıurfa', region: 'Suruç' },
      pv: {
        peakPowerKwp: 50_000, loss: 14, angle: 30, aspect: 0,
        moduleTech: 'crystSi', mounting: 'free', tracking: 1,
        lidPct: 0.02, annualDegradationPct: 0.0045,
        losses: { soilingPct: 3.5, iamPct: 2.0, spectralPct: 0.5, temperaturePct: 6.5, mismatchPct: 1.0, dcCablingPct: 1.5, inverterPct: 1.8, acCablingPct: 1.0, transformerPct: 1.5, availabilityPct: 0.5 },
      },
      consumption: {
        profileId: 'factory_3shift', annualKwh: 100_000_000, growthRatePct: 2,
        prevYearKwh: 98_000_000, sameMeteringPoint: false,
      },
      tariff: {
        consumerGroup: 'SANAYI_MV' as ConsumerGroup,
        purchasePriceTlKwh: 3.58, salePriceTlKwh: 3.20,
        hasBilateralContract: true, bilateralPriceTlKwh: 3.20,
        isLastResortSupply: false, lastResortMultiplier: 1.0938,
        distributionFeeTlKwh: 0.45, consumptionTaxPct: 0.01, vatPct: 0.2,
        electricityInflationPct: 28,
      },
      ppa: {
        enabled: true,
        ppaPriceTlKwh: 4.20,
        ppaTermYears: 15,
        ppaEscalationPct: 2.5,
        scope: 'surplus_only',
        counterpartyName: 'Kurumsal Offtaker (örnek)',
      },
      battery: {
        enabled: true, nominalCapacityKwh: 50_000, nominalPowerKw: 12500,
        roundTripEfficiency: 0.92, minSocPct: 0.1, maxSocPct: 0.95,
        initialSocPct: 0.5, cycleLifeAt80Dod: 6000, calendarLifeYears: 15,
        eolCapacityPct: 0.7, capexTlPerKwh: 8000, capexTlPerKw: 3200,
        bosTl: 5_000_000, augmentationEnabled: true, augmentationYears: [8, 16],
        augmentationKwhPerEvent: 10_000, augmentationCapexDeclinePct: 0.5,
        dispatchStrategy: 'rule_based', enableArbitrage: true,
        enablePeakShaving: true, peakThresholdKw: 15000,
        arbitrageLowThresholdTlKwh: 1.5, arbitrageHighThresholdTlKwh: 5.0,
      },
      financing: {
        type: 'loan', equityPct: 0.25, loanTermYears: 12,
        interestRatePctTl: 32, interestRatePctUsd: 8.5,
        graceMonths: 18, repaymentType: 'annuity', discountRatePct: 18,
        construction: { monthsToCod: 15, curveType: 'realistic', commitmentFeeRate: 0.005, arrangementFeePct: 0.0125, capitalizeIdc: true },
      },
    }),
  },
];

/**
 * Demo'lar için CAPEX'i yeniden hesapla (KapasitELer farklı).
 */
export function ensureCapexComputed(config: ProjectConfig): ProjectConfig {
  if (config.capex && config.capex.total > 0) return config;
  const capex = buildDefaultCapex(config.pv.peakPowerKwp, config.projectType, config.fx.usdTry, config.battery.enabled);
  if (config.battery.enabled) {
    capex.battery =
      config.battery.nominalCapacityKwh * config.battery.capexTlPerKwh +
      config.battery.nominalPowerKw * config.battery.capexTlPerKw +
      config.battery.bosTl;
    capex.total += capex.battery;
  }
  return { ...config, capex };
}
