/**
 * 2026 Türkiye Elektrik Tarifeleri — Seed Data
 *
 * Birincil kaynak:
 *   EPDK Kurul Kararı No: 14461 (02.04.2026)
 *   Resmi Gazete: 04.04.2026
 *   Yürürlük: 04.04.2026
 *
 * Önceki dönem:
 *   EPDK 30.10.2025 kararı kapsamında, yürürlük 01.01.2026 — 03.04.2026
 *
 * Detaylı kaynaklar: docs/tariffs_sources.md
 *
 * Para birimi: TL/kWh (vergi/fon hariç, "vergisiz" — net bedel).
 * Vergi/fon oranları ondalık (örn. 0.20 = %20).
 *
 * NOT — Bu dosyadaki değerler EPDK Excel tablosu sentezlenmiştir.
 * Üretim öncesi her satır EPDK 14461 Excel'iyle çapraz doğrulanmalıdır.
 * `// TODO: doğrula` etiketli kalemler şüpheli verilerdir.
 */

import { TariffEntry, TimeOfUseDefinition, LastResortSupplyConfig, UnlicensedFees } from './schema';

const SOURCE_DECISION_14461 = 'EPDK Kurul Kararı No: 14461 (02.04.2026)';
const SOURCE_URL_DECISION = 'https://www.epdk.gov.tr/detay/icerik/3-100/elektrik-faturalarina-esas-tarife-tablolari';
const SOURCE_URL_GENSED = 'https://gensed.org/4-nisan-2026dan-itibaren-uygulanacak-elektrik-tarifeleri-yayimlandi/';
const SOURCE_URL_PIAGRID = 'https://www.piagrid.com/indirimli-elektrik/elektrik-fiyati';
const SOURCE_URL_SKTT = 'https://m.enerjisa.com.tr/tr/musteri-islemleri/duyurular/son-kaynak-tedarik-tarifesi-limit-degisikligi-hakkinda-bilgilendirme';

const VALID_FROM_14461 = '2026-04-04';
const TODAY = '2026-05-23'; // fetchedAt; admin refresh'te güncellenir

/**
 * Aktif enerji + dağıtım toplamı kaynaklardan alınmaktadır.
 * Burada bileşenleri tahmini dağılımla ayrıştırıyoruz:
 *   energyCharge ≈ %55 toplam (geleneksel oran),
 *   distributionCharge ≈ %35,
 *   transmissionCharge + marketOperation ≈ %10
 *
 * Üretim öncesi EPDK Excel'inden gerçek dağılım alınmalıdır.
 * SeedTariff() yardımcısı bunu yapısal tutar.
 */
function splitBundledTariff(bundledTlKwh: number, distributionTlKwh: number) {
  const transmissionAndMarket = bundledTlKwh * 0.08;
  const transmissionCharge = transmissionAndMarket * 0.85;
  const marketOperationCharge = transmissionAndMarket * 0.15;
  const energyCharge = bundledTlKwh - distributionTlKwh - transmissionAndMarket;
  return {
    energyChargeTlKwh: Number(energyCharge.toFixed(4)),
    distributionChargeTlKwh: distributionTlKwh,
    transmissionChargeTlKwh: Number(transmissionCharge.toFixed(4)),
    marketOperationChargeTlKwh: Number(marketOperationCharge.toFixed(4)),
  };
}

const COMMON_FETCH = {
  fetchedAt: TODAY,
  sourceUrl: SOURCE_URL_PIAGRID,
  sourceDocRef: SOURCE_DECISION_14461,
  validFrom: VALID_FROM_14461,
  validTo: null,
  lossChargeTlKwh: 0, // Anayasa Mahkemesi sonrası 0
  trtShareRate: 0,    // Aralık 2021'de kaldırıldı
};

// ---------- MESKEN AG (kademeli) ----------
const MESKEN_TIER1: TariffEntry = {
  id: 'mesken-lv-single-t1',
  consumerGroup: 'residential',
  voltageLevel: 'LV',
  tariffPeriod: 'single',
  distributionRegion: null,
  tierUpperKwhPerMonth: 240,
  tier: 1,
  ...splitBundledTariff(2.92, 1.84),
  vatRate: 0.01,
  municipalTaxRate: 0.05,
  energyFundRate: 0.01,
  ...COMMON_FETCH,
  notes: 'Kademe 1: aylık ≤ 240 kWh (günlük ≤ 8 kWh). Yıllık 4.000 kWh SKTT eşiği ayrıdır.',
};

const MESKEN_TIER2: TariffEntry = {
  ...MESKEN_TIER1,
  id: 'mesken-lv-single-t2',
  tier: 2,
  ...splitBundledTariff(4.32, 1.84),
  notes: 'Kademe 2: aylık > 240 kWh. Yıllık 4.000 kWh aşılırsa ek olarak SKTT (KBK 1.05) tetiklenir.',
};

// ---------- TICARETHANE AG (kademeli) ----------
const TICARETHANE_TIER1: TariffEntry = {
  id: 'ticarethane-lv-single-t1',
  consumerGroup: 'commercial',
  voltageLevel: 'LV',
  tariffPeriod: 'single',
  distributionRegion: null,
  tierUpperKwhPerMonth: 900, // ≈ 30 kWh/gün × 30 gün
  tier: 1,
  ...splitBundledTariff(5.35, 1.88),
  vatRate: 0.20,
  municipalTaxRate: 0.05,
  energyFundRate: 0.02,
  ...COMMON_FETCH,
  notes: 'Kademe 1: günlük ≤ 30 kWh.',
};

const TICARETHANE_TIER2: TariffEntry = {
  ...TICARETHANE_TIER1,
  id: 'ticarethane-lv-single-t2',
  tier: 2,
  ...splitBundledTariff(5.93, 1.88),
  notes: 'Kademe 2: günlük > 30 kWh.',
};

// ---------- SANAYI AG (tek terimli) ----------
const SANAYI_LV: TariffEntry = {
  id: 'sanayi-lv-single',
  consumerGroup: 'industrial',
  voltageLevel: 'LV',
  tariffPeriod: 'single',
  distributionRegion: null,
  tierUpperKwhPerMonth: null,
  tier: null,
  ...splitBundledTariff(4.81, 1.39),
  vatRate: 0.20,
  municipalTaxRate: 0.01,
  energyFundRate: 0.02,
  ...COMMON_FETCH,
};

// ---------- SANAYI OG ----------
// TODO: doğrula — kaynak bulunamadı; EPDK 14461 Excel tablosundan doğrulanmalı.
// Sanayi OG genellikle AG'den ~15-20% daha düşüktür (dağıtım kaybı azlığı).
const SANAYI_MV: TariffEntry = {
  id: 'sanayi-mv-single',
  consumerGroup: 'industrial',
  voltageLevel: 'MV',
  tariffPeriod: 'single',
  distributionRegion: null,
  tierUpperKwhPerMonth: null,
  tier: null,
  ...splitBundledTariff(4.05, 0.50),
  vatRate: 0.20,
  municipalTaxRate: 0.01,
  energyFundRate: 0.02,
  ...COMMON_FETCH,
  notes: 'TODO: doğrula — Sanayi OG dağıtım bedeli EPDK 14461 Excel\'inden alınmalı.',
};

// ---------- TARIMSAL SULAMA ----------
const TARIMSAL_SULAMA: TariffEntry = {
  id: 'tarimsal-sulama-lv-single',
  consumerGroup: 'agricultural',
  voltageLevel: 'LV',
  tariffPeriod: 'single',
  distributionRegion: null,
  tierUpperKwhPerMonth: null,
  tier: null,
  ...splitBundledTariff(4.37, 1.50),
  vatRate: 0.01,
  municipalTaxRate: 0.01,
  energyFundRate: 0.01,
  ...COMMON_FETCH,
  notes: 'Sübvansiyonlu tarife; mesken benzeri KDV %1.',
};

// ---------- AYDINLATMA ----------
const AYDINLATMA: TariffEntry = {
  id: 'aydinlatma-lv-single',
  consumerGroup: 'lighting',
  voltageLevel: 'LV',
  tariffPeriod: 'single',
  distributionRegion: null,
  tierUpperKwhPerMonth: null,
  tier: null,
  ...splitBundledTariff(4.50, 1.50),
  vatRate: 0.20,
  municipalTaxRate: 0.05,
  energyFundRate: 0.02,
  ...COMMON_FETCH,
  notes: 'TODO: doğrula — Aydınlatma tarifesi EPDK 14461 Excel\'inden doğrulanmalı.',
};

// ---------- ÜÇ ZAMANLI TARİFE (TICARETHANE AG için temsili) ----------
// T1 Puant, T2 Gündüz, T3 Gece — saatler TimeOfUseDefinition'da
const TICARETHANE_TOU_NIGHT: TariffEntry = {
  id: 'ticarethane-lv-night',
  consumerGroup: 'commercial',
  voltageLevel: 'LV',
  tariffPeriod: 'night',
  distributionRegion: null,
  tierUpperKwhPerMonth: null,
  tier: null,
  ...splitBundledTariff(2.94, 1.88),
  vatRate: 0.20,
  municipalTaxRate: 0.05,
  energyFundRate: 0.02,
  ...COMMON_FETCH,
};

const TICARETHANE_TOU_DAY: TariffEntry = {
  ...TICARETHANE_TOU_NIGHT,
  id: 'ticarethane-lv-day',
  tariffPeriod: 'daytime',
  ...splitBundledTariff(4.38, 1.88),
};

const TICARETHANE_TOU_PEAK: TariffEntry = {
  ...TICARETHANE_TOU_NIGHT,
  id: 'ticarethane-lv-peak',
  tariffPeriod: 'peak',
  ...splitBundledTariff(6.17, 1.88),
};

// Aynı üç zamanlı yapı sanayi LV için de geçerli — fiyat farkı ihmal edilebilir
const SANAYI_TOU_NIGHT: TariffEntry = {
  ...TICARETHANE_TOU_NIGHT,
  id: 'sanayi-lv-night',
  consumerGroup: 'industrial',
  ...splitBundledTariff(2.45, 1.39),
  vatRate: 0.20,
  municipalTaxRate: 0.01,
};

const SANAYI_TOU_DAY: TariffEntry = {
  ...SANAYI_TOU_NIGHT,
  id: 'sanayi-lv-day',
  tariffPeriod: 'daytime',
  ...splitBundledTariff(3.95, 1.39),
};

const SANAYI_TOU_PEAK: TariffEntry = {
  ...SANAYI_TOU_NIGHT,
  id: 'sanayi-lv-peak',
  tariffPeriod: 'peak',
  ...splitBundledTariff(5.70, 1.39),
};

// ---------- TÜM TARİFELER ----------
export const TARIFFS_2026: TariffEntry[] = [
  MESKEN_TIER1,
  MESKEN_TIER2,
  TICARETHANE_TIER1,
  TICARETHANE_TIER2,
  SANAYI_LV,
  SANAYI_MV,
  TARIMSAL_SULAMA,
  AYDINLATMA,
  TICARETHANE_TOU_NIGHT,
  TICARETHANE_TOU_DAY,
  TICARETHANE_TOU_PEAK,
  SANAYI_TOU_NIGHT,
  SANAYI_TOU_DAY,
  SANAYI_TOU_PEAK,
];

// ---------- ÜÇ ZAMANLI TARİFE SAAT TANIMI ----------
export const TIME_OF_USE_2026: TimeOfUseDefinition = {
  // EPDK güncel duyurusu (2026): T2 başlangıcı 08:00, T3 başlangıcı 23:00
  // 2024-2025: T2 06:00-17:00 idi. 2026 itibarıyla değişti.
  daytimeStartHour: 8,
  daytimeEndHour: 17,   // 08:00 - 17:00
  peakStartHour: 17,
  peakEndHour: 22,       // 17:00 - 22:00
  nightStartHour: 23,
  nightEndHour: 8,       // 22:00-23:00 daytime kabul, 23:00-08:00 night
  sourceRef: SOURCE_DECISION_14461,
  notes: 'EPDK 14461 saatleri. T2 (gündüz) 22:00-23:00 aralığını da kapsar. T3 (gece) 23:00-08:00.',
};

// ---------- SKTT ----------
export const LAST_RESORT_2026: LastResortSupplyConfig = {
  residentialThresholdKwhYearly: 4000,
  commercialIndustrialThresholdKwhYearly: 15000,
  agriculturalThresholdKwhYearly: 150_000_000,
  residentialKbk: 1.05,
  otherKbk: 1.0938,
  formulaNotes: 'SKTT = (PTF + YEKDEM) × KBK. Aylık güncellenen PTF/YEKDEM değerleri kullanılır.',
  sourceUrl: SOURCE_URL_SKTT,
  sourceDocRef: 'EPDK Kurul Kararı 30.10.2025 (SKTT limitleri); 14461 sonrası geçerliliği değişmedi.',
  validFrom: '2026-01-01',
  validTo: null,
};

// ---------- LİSANSSIZ ÜRETİM ----------
// TODO: doğrula — TEDAŞ 2026 güncel bedeller doğrulanmalı
export const UNLICENSED_FEES_2026: UnlicensedFees = {
  applicationFeeTl: null,
  processFeeTl: null,
  projectApprovalFeeTlPerKwp: null,
  acceptanceFeeTl: null,
  annualOperationFeeTl: null,
  distributionFeeTlKwh: 0.496738, // 10/05/2019 sonrası; 2025 Temmuz verisi, 2026 doğrulanmalı
  sourceRef: 'TEDAŞ Lisanssız Elektrik Üretimi (2026-01-01 itibarıyla güncellenir)',
  validFrom: '2026-01-01',
  notes: 'TODO: doğrula — TEDAŞ duyuruları sayfasından 2026 güncel rakamlar çekilmeli.',
};
