/**
 * Tarife şeması — 2026 EPDK Kurul Kararı 14461 ve sonraki güncellemeler için.
 *
 * Birim para: TL. Hassas hesaplamada string-olarak saklanır,
 * uygulama içi hesaplamada Number'a çevrilir (kuruş hassasiyeti yeter).
 * Üretim seviyesinde decimal.js kütüphanesi tercih edilir.
 *
 * Tüm vergi/fon ORANLARI ondalık fraction olarak (örn. 0.20 = %20).
 *
 * Detaylı kaynak: docs/tariffs_sources.md
 */

export type ConsumerGroupV2 =
  | 'residential'      // mesken
  | 'commercial'       // ticarethane (kamu+özel hizmetler dahil)
  | 'industrial'       // sanayi
  | 'agricultural'     // tarımsal sulama / tarımsal faaliyetler
  | 'lighting';        // aydınlatma

export type VoltageLevel = 'LV' | 'MV' | 'HV'; // AG / OG / YG

export type TariffPeriod = 'single' | 'daytime' | 'peak' | 'night';

export type DistributionRegion =
  | 'BOGAZICI' | 'AYEDAS' | 'TRAKYA' | 'OSMANGAZI' | 'SAKARYA' | 'ULUDAG'
  | 'GEDIZ' | 'AYDEM' | 'CORUH' | 'ARAS' | 'FIRAT' | 'CAMLIBEL' | 'MERAM'
  | 'BASKENT' | 'AKDENIZ' | 'TOROSLAR' | 'KAYSERI' | 'YESILIRMAK'
  | 'GOKSU' | 'DICLE' | 'VANGOLU';

export interface TariffEntry {
  id: string;
  consumerGroup: ConsumerGroupV2;
  voltageLevel: VoltageLevel;
  tariffPeriod: TariffPeriod;
  distributionRegion: DistributionRegion | null;

  /** Mesken/ticarethane kademe sınırı (kWh/ay, null = kademesiz) */
  tierUpperKwhPerMonth: number | null;
  /** Kademeli tarifede bu satırın hangi kademe olduğu (1=alt, 2=üst) */
  tier: 1 | 2 | null;

  // Bileşenler — TL/kWh (vergi/fon hariç)
  energyChargeTlKwh: number;
  distributionChargeTlKwh: number;
  transmissionChargeTlKwh: number;
  marketOperationChargeTlKwh: number;
  /** Anayasa Mahkemesi kararı sonrası genelde 0 */
  lossChargeTlKwh: number;

  // Vergi/fonlar — ondalık (0.20 = %20)
  vatRate: number;
  municipalTaxRate: number;
  energyFundRate: number;
  trtShareRate: number;

  // Geçerlilik
  validFrom: string;        // ISO date
  validTo: string | null;   // ISO date veya null (hala geçerli)

  // Kaynak
  sourceUrl: string;
  sourceDocRef: string;     // örn. "EPDK Kurul Kararı No: 14461 (02.04.2026)"
  fetchedAt: string;        // ISO date
  notes?: string;
}

export interface TimeOfUseDefinition {
  daytimeStartHour: number; // 0-23
  daytimeEndHour: number;
  peakStartHour: number;
  peakEndHour: number;
  nightStartHour: number;
  nightEndHour: number;
  sourceRef: string;
  notes?: string;
}

export interface LastResortSupplyConfig {
  residentialThresholdKwhYearly: number;
  commercialIndustrialThresholdKwhYearly: number;
  agriculturalThresholdKwhYearly: number;
  residentialKbk: number;
  otherKbk: number;
  formulaNotes: string;
  sourceUrl: string;
  sourceDocRef: string;
  validFrom: string;
  validTo: string | null;
}

export interface ReactivePowerPenalty {
  inductiveThresholdPct: number;
  capacitiveThresholdPct: number;
  penaltyFormula: string;
  appliesToGroups: ConsumerGroupV2[];
  sourceRef: string;
}

export interface UnlicensedFees {
  applicationFeeTl: number | null;
  processFeeTl: number | null;
  projectApprovalFeeTlPerKwp: number | null;
  acceptanceFeeTl: number | null;
  annualOperationFeeTl: number | null;
  /** Lisanssız üretim tesisi dağıtım bedeli (10/05/2019 sonrası çağrı mektubu) */
  distributionFeeTlKwh: number | null;
  sourceRef: string;
  validFrom: string;
  notes?: string;
}

/**
 * Tek bir abone grubu için fatura hesaplama girdisi.
 */
export interface BillCalculationInput {
  consumerGroup: ConsumerGroupV2;
  voltageLevel: VoltageLevel;
  /** Tek zamanlı mı, üç zamanlı mı? */
  useTimeOfUse: boolean;
  /** Tek zamanlı veya saat aralıkları toplamları */
  consumption: SingleConsumption | TouConsumption;
  /** Yıllık toplam tüketim — SKTT eşiği kontrolü için */
  annualConsumptionKwh?: number;
  /** Talep güç (kW) — sanayi OG için */
  demandKw?: number;
}

export interface SingleConsumption {
  kind: 'single';
  monthlyKwh: number;
}

export interface TouConsumption {
  kind: 'tou';
  daytimeKwh: number;
  peakKwh: number;
  nightKwh: number;
}

export interface BillBreakdown {
  /** Aktif enerji + dağıtım + iletim + piyasa işletim (vergi/fon hariç) */
  netEnergyTl: number;
  energyFundTl: number;
  municipalTaxTl: number;
  vatBaseTl: number;
  vatTl: number;
  totalTl: number;
  /** Hangi tarife satırı(ları) kullanıldı */
  appliedEntries: string[];
  /** SKTT uygulandı mı (mesken yıllık limit aşımı) */
  sktApplied: boolean;
  notes: string[];
}
