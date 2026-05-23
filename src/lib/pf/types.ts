/**
 * Project Finance — 6 modüllü banka modeli (EBRD/UKEF standart).
 * Karapınar GES (1.35 GW) referans alınarak adapte edildi.
 *
 * Tüm finansal değerler TL bazında saklanır; gösterimde currency toggle dönüşümü yapılır.
 * Aylık periyot zinciri kullanılır (çeyreklik ve yıllık agregat türetilir).
 */

// ---------- MODÜL 2: CAPEX S-Curve ----------

export type SCurveType = 'beta' | 'linear' | 'front' | 'back' | 'realistic' | 'custom';

export interface CapexScheduleInput {
  totalCapexTl: number;
  constructionMonths: number;
  curveType: SCurveType;
  customMonthlyPct?: number[]; // her ay yüzdesi, toplam 1.0
  /** İsteğe bağlı kategori bazında C/E/M ayrımı */
  capexByCategory?: {
    civil: number;      // C — temel, çelik, kazı
    electrical: number; // E — kablo, pano, invertör
    module: number;     // M — paneller (son aylar)
  };
}

export interface CapexScheduleResult {
  monthlyCapexTotal: number[];
  cumulativeCapex: number[];
  curveType: SCurveType;
  /** Aylık tablo (kategori bazlı): civil[m], electrical[m], module[m] */
  byCategory?: {
    civil: number[];
    electrical: number[];
    module: number[];
  };
}

// ---------- MODÜL 1: IDC ----------

export interface IdcInput {
  monthlyCapexDrawdowns: number[]; // S-curve sonucu (aylık TL)
  debtRatio: number;                // 0..1 (örn 0.60)
  annualInterestRate: number;       // 0..1 (örn 0.12 = %12)
  commitmentFeeRate: number;        // 0..1 yıllık (örn 0.005 = %0.5)
  arrangementFeePct: number;        // 0..1 tek seferlik (örn 0.01 = %1)
}

export interface IdcResult {
  totalIdc: number;
  monthlyIdc: number[];
  monthlyCommitmentFee: number[];
  arrangementFee: number;
  totalFinanceCost: number;
  outstandingDebtAtCod: number; // COD'da kredi bakiyesi (IDC dahil)
  monthlyOutstandingDebt: number[]; // her ay sonu bakiye
  monthlyDrawdown: number[]; // her ay kredi çekiş
  /** Equity drawdown da aylık takip edilir (S-curve × equity ratio) */
  monthlyEquityDrawdown: number[];
}

// ---------- MODÜL 4: FX P&L ----------

export interface FxInput {
  /** USD bakiyesi her ay sonu (USD cinsinden) — kredi anaparası */
  usdDebtBalanceMonthly: number[];
  /** USD cash bakiyesi her ay sonu (varsa) */
  usdCashBalanceMonthly: number[];
  /** USD/TL kuru her ay sonu */
  usdTryMonthly: number[];
  /** COD ayı indeksi — bundan önce kapitalize, sonra P&L */
  codMonthIndex: number;
}

export interface FxResult {
  monthlyFxPnlTry: number[];        // negatif = TL zararı
  cumulativeFxPnlTry: number;
  quarterlyFxPnlTry: number[];
  annualFxPnlTry: number[];
  fxCapitalizedInConstruction: number;
  fxThroughPnlOperation: number;
}

// ---------- MODÜL 3: Coverage Ratios ----------

export interface QuarterlyCashFlow {
  quarterIndex: number;
  cfads: number;             // Cash Flow Available for Debt Service
  debtService: number;       // anapara + faiz
  outstandingDebt: number;
  isOperatingPeriod: boolean;
}

export interface BankThresholds {
  minDscrFloor: number;    // 1.20 — kırmızı altı
  minDscrTarget: number;   // 1.30 — sarı altı
  avgDscrTarget: number;   // 1.40
  llcrTarget: number;      // 1.30
  plcrTarget: number;      // 1.50
}

export const DEFAULT_BANK_THRESHOLDS: BankThresholds = {
  minDscrFloor: 1.20,
  minDscrTarget: 1.30,
  avgDscrTarget: 1.40,
  llcrTarget: 1.30,
  plcrTarget: 1.50,
};

export type BankApprovalStatus = 'green' | 'yellow' | 'red';

export interface CoverageResult {
  dscrQuarterly: number[];
  minDscr: number;
  avgDscr: number;
  llcr: number;
  plcr: number;
  bankApprovalStatus: BankApprovalStatus;
  failedThresholds: string[];
}

// ---------- MODÜL 5: Master Check ----------

export type CheckSeverity = 'error' | 'warning' | 'info';

export interface CheckResult {
  name: string;
  passed: boolean;
  severity: CheckSeverity;
  expected: number | null;
  actual: number | null;
  tolerance: number;
  message: string;
}

export interface MasterCheckReport {
  masterCheckPassed: boolean;
  totalChecks: number;
  passedCount: number;
  failedCount: number;
  warningCount: number;
  individualResults: CheckResult[];
}

// ---------- MODÜL 6: Scenario Matrix ----------

export type StructureType = 'fixed_mono' | 'fixed_bifacial' | 'tracker_mono' | 'tracker_bifacial' | 'tilted_mono' | 'tilted_bifacial';

export const STRUCTURE_LABELS: Record<StructureType, string> = {
  fixed_mono: 'Fixed-Mono',
  fixed_bifacial: 'Fixed-Bifacial',
  tracker_mono: 'Tracker-Mono',
  tracker_bifacial: 'Tracker-Bifacial',
  tilted_mono: 'Tilted-Mono',
  tilted_bifacial: 'Tilted-Bifacial',
};

/** Konfigürasyon → spesifik üretim çarpanı (fixed mono base = 1.00) */
export const STRUCTURE_YIELD_FACTOR: Record<StructureType, number> = {
  fixed_mono: 1.00,
  fixed_bifacial: 1.08,   // bifacial +8%
  tracker_mono: 1.18,     // 1-axis tracker +18%
  tracker_bifacial: 1.27, // tracker + bifacial
  tilted_mono: 1.05,      // optimum tilt +5%
  tilted_bifacial: 1.13,
};

export interface ScenarioPoint {
  dcAcRatio: number;
  structure: StructureType;
  batterySizeRatio: number; // 0 = yok, 0.25, 0.50, 0.75, 1.00 (günlük üretim oranı)
  // Sonuçlar
  projectIrr: number;
  projectNpv: number;
  equityIrr: number;
  paybackYears: number;
  requiredEquityTl: number;
  lcoeTlKwh: number;
  minDscr: number;
}

export const DC_AC_VALUES = [1.0, 1.1, 1.2, 1.3, 1.4];
export const STRUCTURE_VALUES: StructureType[] = ['fixed_mono', 'fixed_bifacial', 'tracker_mono', 'tracker_bifacial', 'tilted_mono', 'tilted_bifacial'];
export const BATTERY_RATIOS = [0, 0.25, 0.50, 0.75, 1.00];
