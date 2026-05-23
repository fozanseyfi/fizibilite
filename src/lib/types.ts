// Core domain types for GES-Fizibilite Pro
// EPDK Karar 14531 (30.04.2026) — Saatlik Mahsuplaşma rejimi

export const HOURS_PER_YEAR = 8760;

export type ConsumerGroup =
  | 'MESKEN'
  | 'TICARETHANE_LV'
  | 'TICARETHANE_MV'
  | 'SANAYI_LV'
  | 'SANAYI_MV'
  | 'TARIMSAL_SULAMA'
  | 'AYDINLATMA';

export type ProjectType = 'rooftop_ci' | 'ground_mount' | 'hybrid_bess';

export type ModuleTech = 'crystSi' | 'CIS' | 'CdTe';
export type Mounting = 'free' | 'building';
export type TrackingType = 0 | 1 | 2 | 3 | 4 | 5;

export type DispatchStrategy = 'rule_based' | 'optimal_lp';

export type FinancingType = 'equity' | 'loan' | 'leasing';

export interface Location {
  lat: number;
  lon: number;
  city?: string;
  region?: string;
}

export interface PVSystemConfig {
  peakPowerKwp: number;
  loss: number; // %
  angle: number; // °
  aspect: number; // -180..180 (Güney=0)
  moduleTech: ModuleTech;
  mounting: Mounting;
  tracking: TrackingType;
  lidPct: number; // ilk yıl Light Induced Degradation, fraction (0.02 = %2)
  annualDegradationPct: number; // yıllık panel degradasyonu, fraction (0.005 = %0.5)
}

export interface ConsumptionProfileMeta {
  id: string;
  label: string;
  peakHours: string;
  category: 'office' | 'retail' | 'industry' | 'agriculture' | 'public';
}

export interface ConsumptionConfig {
  profileId: string; // veya 'custom_builder'
  annualKwh: number;
  growthRatePct: number; // yıllık % büyüme
  hourly?: number[]; // 8760 saat, opsiyonel override
  prevYearKwh: number; // bedelli üretim limiti için
  sameMeteringPoint: boolean;
  samePointData?: {
    A: number;
    B: number;
    C: number;
  };
  /** ConsumptionBuilder UI'sından gelen yapılandırma (profileId === 'custom_builder' ise kullanılır) */
  builder?: {
    daily: {
      slot_00_06: number;
      slot_06_10: number;
      slot_10_14: number;
      slot_14_18: number;
      slot_18_24: number;
    };
    monthly: number[]; // 12 değer, toplam 100
    weekendFactor: number;
  };
}

export interface TariffConfig {
  consumerGroup: ConsumerGroup;
  purchasePriceTlKwh: number; // tüketim alış
  salePriceTlKwh: number; // mahsup + ihtiyaç fazlası satış
  bilateralPriceTlKwh: number | null;
  hasBilateralContract: boolean;
  isLastResortSupply: boolean;
  lastResortMultiplier: number; // 1.0938 ticarethane/sanayi default
  distributionFeeTlKwh: number;
  consumptionTaxPct: number; // 0.05 mesken/ticarethane, 0.01 sanayi
  vatPct: number; // 0.20 genel, 0.01 mesken
  electricityInflationPct: number; // yıllık elektrik fiyat artışı
}

export interface BatteryConfig {
  enabled: boolean;
  nominalCapacityKwh: number;
  nominalPowerKw: number;
  roundTripEfficiency: number; // 0.92 LFP
  minSocPct: number; // 0.10
  maxSocPct: number; // 0.95
  initialSocPct: number; // 0.50
  cycleLifeAt80Dod: number; // 6000
  calendarLifeYears: number; // 15
  eolCapacityPct: number; // 0.70
  capexTlPerKwh: number;
  capexTlPerKw: number;
  bosTl: number;
  augmentationEnabled: boolean;
  augmentationYears: number[];
  augmentationKwhPerEvent: number;
  augmentationCapexDeclinePct: number; // 0.5 = future yıl %50 ucuz
  dispatchStrategy: DispatchStrategy;
  enableArbitrage: boolean;
  enablePeakShaving: boolean;
  peakThresholdKw: number;
  arbitrageLowThresholdTlKwh: number;
  arbitrageHighThresholdTlKwh: number;
}

export interface CapexBreakdown {
  pvModule: number; // TL
  inverter: number;
  mounting: number;
  cabling: number;
  labor: number;
  engineering: number;
  gridConnection: number;
  tedasZbof: number;
  land: number;
  insurance: number;
  contingency: number;
  battery: number;
  total: number;
}

export interface OpexConfig {
  omTlPerKwpYear: number;
  insurancePctCapex: number;
  inverterReplacementPctCapex: number; // yıl 12'de
  inverterReplacementYear: number;
  spareParts: number;
  security: number;
  systemUsageTlKwh: number;
  propertyTax: number;
  managementFees: number;
}

export interface FinancingConfig {
  type: FinancingType;
  // Loan
  equityPct?: number; // 0..1
  loanTermYears?: number;
  interestRatePctTl?: number;
  interestRatePctUsd?: number;
  graceMonths?: number;
  repaymentType?: 'annuity' | 'equal_principal';
  // Leasing
  leasingMonthlyTl?: number;
  leasingTermMonths?: number;
  leasingResidualPctTl?: number;
  // Genel
  discountRatePct: number;
  // Refinansman (opsiyonel)
  refinancing?: RefinancingConfig;
  // İnşaat dönemi parametreleri (MODÜL 1-2)
  construction?: ConstructionConfig;
}

export interface ConstructionConfig {
  /** İnşaat süresi (ay) — Notice-to-Proceed → COD */
  monthsToCod: number;
  /** S-curve tipi */
  curveType: 'beta' | 'linear' | 'front' | 'back' | 'realistic' | 'custom';
  customMonthlyPct?: number[];
  /** Commitment fee yıllık % (kullanılmayan kredi üzerinden) */
  commitmentFeeRate?: number;
  /** Arrangement fee tek seferlik % (kredi tutarı üzerinden) */
  arrangementFeePct?: number;
  /** IDC kapitalize edilsin mi (default true) */
  capitalizeIdc?: boolean;
}

export interface RefinancingConfig {
  enabled: boolean;
  /** Yıl N başında refinansman yapılır */
  yearN: number;
  /** Yeni faiz oranı (%) */
  newInterestRatePctTl: number;
  /** Yeni vade (yıl) — refinansman tarihinden itibaren */
  newTermYears: number;
  /** Refinansman komisyonu (kalan anaparanın yüzdesi) */
  refinancingFeePct: number;
}

/** PPA — Power Purchase Agreement (ikili anlaşma) */
export interface PPAConfig {
  enabled: boolean;
  /** Anlaşma fiyatı (TL/kWh, sabit) */
  ppaPriceTlKwh: number;
  /** Anlaşma süresi (yıl) — bu süre boyunca PPA fiyatı kullanılır, sonra tarife */
  ppaTermYears: number;
  /** PPA fiyatı yıllık escalation (%) */
  ppaEscalationPct: number;
  /** Kapsam: 'all' tüm satış PPA fiyatından, 'surplus_only' sadece ihtiyaç fazlası */
  scope: 'all' | 'surplus_only';
  /** Karşı taraf adı (rapor için) */
  counterpartyName?: string;
}

/** Karbon Kredisi (VCS / Gold Standard) */
export interface CarbonCreditConfig {
  enabled: boolean;
  /** Standart: VCS, Gold Standard, CDM, vs */
  standard: 'VCS' | 'GOLD_STANDARD' | 'CDM' | 'OTHER';
  /** USD per ton CO2e */
  pricePerTonUsd: number;
  /** Sertifika maliyeti (yıllık, USD) — audit + verification + registry */
  certificationCostUsdYearly: number;
  /** Crediting period (yıl) */
  creditingPeriodYears: number;
}

export interface TaxConfig {
  vatPct: number; // 0.20
  vatRefundEnabled: boolean; // 5746 / yatırım indirimi
  corporateTaxPct: number; // 0.25
  amortizationYears: number; // 10 default
  investmentIncentiveEnabled: boolean;
  incentiveRegion: 1 | 2 | 3 | 4 | 5 | 6;
  incentiveCorpTaxReductionPct: number; // 0..1
}

export interface FxConfig {
  usdTry: number;
  trInflationPct: number;
  usInflationPct: number;
  fxProjection: 'static' | 'ppp';
}

export interface MonteCarloConfig {
  enabled: boolean;
  iterations: number; // 1000 default
  seed?: number;
  // Stokastik parametreler standart sapmaları
  generationSigmaPct: number;
  consumptionGrowthSigmaPct: number;
  electricityInflationTriangular: [number, number, number]; // min, mode, max
  trInflationTriangular: [number, number, number];
  fxAnnualVolPct: number; // 0.18
  degradationSigmaPct: number;
  cycleLifeSigmaPct: number;
  omSigmaPct: number;
  capexOverrunTriangular: [number, number, number]; // min, mode, max (örn. 0, 0, 0.20)
}

export interface ProjectConfig {
  name: string;
  description?: string;
  projectType: ProjectType;
  location: Location;
  pv: PVSystemConfig;
  consumption: ConsumptionConfig;
  tariff: TariffConfig;
  battery: BatteryConfig;
  capex: CapexBreakdown;
  opex: OpexConfig;
  financing: FinancingConfig;
  tax: TaxConfig;
  fx: FxConfig;
  monteCarlo: MonteCarloConfig;
  analysisYears: number;
  generationOverride?: number[];
  /** Power Purchase Agreement (opsiyonel) */
  ppa?: PPAConfig;
  /** Karbon kredisi (opsiyonel) */
  carbonCredit?: CarbonCreditConfig;
  /** PTF saatlik veri (opsiyonel) — batarya arbitraj için */
  ptfHourly?: number[];
  /** Senaryo matrisi için yapı-bazlı CAPEX/OPEX (opsiyonel) */
  scenarioMatrixInputs?: ScenarioMatrixInputsConfig;
}

export interface ScenarioMatrixInputsConfig {
  /** Her yapı için birim CAPEX (USD/Wp) */
  capexUsdPerWp: Record<string, number>; // key: StructureType, value: USD/Wp
  /** Her yapı için yıllık OPEX (TL/kWp/yıl) */
  opexTlPerKwpYear: Record<string, number>;
  /** Batarya birim CAPEX (TL/kWh) */
  batteryCapexTlPerKwh: number;
}

// ========== Results ==========

export interface NettingResult {
  netted: number[]; // 8760 — saatlik mahsuplaşılan kWh
  netConsumption: number[]; // 8760 — şebekeden çekilen
  surplusGeneration: number[]; // 8760 — fazla üretim (limit altı + üstü)
  paidSurplus: number[]; // 8760 — bedelli satılabilir fazla
  yekdemFree: number[]; // 8760 — YEKDEM bedelsiz
  cumulativeGeneration: number[]; // 8760
  paidGenerationLimitKwh: number;
  overLimitStartHour: number | null;
  annual: {
    totalGeneration: number;
    totalConsumption: number;
    totalNetted: number;
    totalNetConsumption: number;
    totalSurplus: number;
    totalPaidSurplus: number;
    totalYekdemFree: number;
    selfConsumptionRatio: number;
    autonomyRatio: number;
  };
}

export interface BatteryDispatchResult {
  soc: number[]; // 8760 — SoC oranı (0..1)
  charge: number[]; // 8760 — bataryaya yükleme (kWh, GES-only)
  gridCharge: number[]; // 8760 — şebekeden yükleme (kWh)
  discharge: number[]; // 8760 — bataryadan boşaltım (kWh)
  cycles: number; // yıllık eşdeğer döngü
  effectiveCapacityKwh: number;
  generationAfterBattery: number[]; // 8760
  consumptionAfterBattery: number[]; // 8760
}

/**
 * Tek bir dönemin (ay veya yıl) tam finansal hesabı.
 * Yapı, kullanıcının onayladığı banka modeli şablonuna birebir uyar:
 * INCOME STATEMENT + CASH FLOW STATEMENT + CASH WATERFALL.
 */
export interface PeriodFinance {
  // Tarih
  periodIndex: number;      // 1..N (ay veya yıl sırası)
  year: number;             // 1..analysisYears
  month?: number;           // 1..12 (sadece monthly tabloda)
  quarter?: number;         // 1..4
  label: string;            // "2026" veya "2026-04"

  // ENERJİ
  generationKwh: number;
  consumptionKwh: number;
  nettedKwh: number;
  paidSurplusKwh: number;
  yekdemFreeKwh: number;

  // --- INCOME STATEMENT ---
  salesRevenueTl: number;              // ihtiyaç fazlası satış + (mahsuplaşma tasarrufu)
  scrappedEquipmentTl: number;         // 25. yıl hurda değeri
  netSalesTl: number;                  // = salesRevenue + scrappedEquipment
  transmissionOperationalFeesTl: number;
  otherFeesTl: number;
  grossProfitTl: number;               // = netSales - (transmission + other fees)
  insuranceCostTl: number;
  correctiveMaintenanceTl: number;
  preventiveMaintenanceTl: number;
  totalPayrollTl: number;
  ebitdaTl: number;                    // = grossProfit - (insurance+CM+PM+payroll)
  depreciationTl: number;
  ebitTl: number;
  fxGainLossTl: number;                // pozitif gain, negatif loss
  interestExpenseTl: number;
  earningsBeforeTaxTl: number;
  fxGainLossAddbackTl: number;         // vergi matrahından düşülen FX
  taxExpenseTl: number;
  netIncomeTl: number;

  // --- CASH FLOW STATEMENT ---
  // Operating
  cfRevenueTl: number;
  cfAllInCostOfSalesTl: number;
  owcRequirementTl: number;            // operating working capital
  changeInOwcTl: number;
  corporateIncomeTaxCfTl: number;
  vatCfTl: number;
  netOperatingCashFlowTl: number;
  // Investing
  capexCfTl: number;                   // negatif = harcama
  netInvestingCashFlowTl: number;
  // Financing
  drawdownTl: number;                  // kredi çekiş (yıl 0)
  repaymentTl: number;                 // anapara geri ödeme
  interestExpenseCfTl: number;
  commitmentFeeTl: number;
  arrangementFeeTl: number;
  equityTl: number;                    // öz sermaye girişi
  additionalEquityToCureDscrTl: number;
  netWorkingCapitalLoanDrawdownTl: number;
  netWorkingCapitalLoanRepaymentTl: number;
  netFinancingCashFlowTl: number;
  // Cash Balance
  cashOpeningTl: number;
  cashAdditionDisposalTl: number;
  cashClosingTl: number;

  // --- CASH WATERFALL ---
  revenuesTl: number;
  operatingCostsTl: number;
  changeInWorkingCapitalTl: number;
  netVatCashFlowTl: number;
  capexWaterfallTl: number;
  operatingCashFlowBeforeTaxTl: number;
  corporateIncomeTaxPaidTl: number;
  cfadsTl: number;                     // Cash Flow Available for Debt Service

  // FCFC (Free Cash Flow to the Company)
  netFcfcTl: number;
  discountedNetFcfcTl: number;
  cumulativeNetFcfcTl: number;

  // FCFE (Free Cash Flow to Equity)
  netFcfeTl: number;
  discountedNetFcfeTl: number;
  cumulativeNetFcfeTl: number;

  // Diğer
  dscr: number;
  co2OffsetKg: number;
}

/** Geriye dönük uyumluluk — eski YearlyFinance referansları için alias */
export type YearlyFinance = PeriodFinance;

export interface FinanceResult {
  yearly: PeriodFinance[];
  monthly: PeriodFinance[];
  totalCapexTl: number;
  totalOpexTl: number;
  totalRevenueTl: number;
  npvTl: number;
  npvUsd: number;
  irrPct: number;
  mirrPct: number;
  /** FCFC bazında payback (yıl) */
  fcfcPaybackYears: number;
  /** FCFE bazında payback (yıl) */
  fcfePaybackYears: number;
  simplePaybackYears: number;
  discountedPaybackYears: number;
  lcoeTlKwh: number;
  lcoeUsdKwh: number;
  roiPct: number;
  roePct: number;
  avgDscr: number;
  totalCo2Tons: number;
  equivalentTrees: number;
}

export interface MonteCarloResult {
  iterations: number;
  irr: { mean: number; p10: number; p50: number; p90: number; var5: number; var95: number; std: number };
  npv: { mean: number; p10: number; p50: number; p90: number; var5: number; var95: number; std: number };
  payback: { mean: number; p10: number; p50: number; p90: number };
  probabilityNpvPositive: number;
  tornado: Array<{ variable: string; lowImpact: number; highImpact: number }>;
  samples: Array<{ irr: number; npv: number; payback: number }>;
}

export interface SimulationResult {
  generationByYear: number[][]; // [year][hour]
  consumptionByYear: number[][];
  nettingByYear: NettingResult[];
  batteryByYear: BatteryDispatchResult[];
  finance: FinanceResult;
  monteCarlo?: MonteCarloResult;
  computedAt: string; // ISO timestamp
  durationMs: number;
}
