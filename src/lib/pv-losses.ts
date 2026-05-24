/**
 * PVSyst tarzı kayıp kırınımı.
 * Toplam sistem kaybı (PV system "loss" parametresi) bu kalemlerin bileşkesi:
 *
 *   - Soiling (kirlilik)
 *   - IAM (Incidence Angle Modifier — açısal yansıma)
 *   - Spectral
 *   - Temperature (sıcaklık)
 *   - Mismatch (modül-modül uyumsuzluk)
 *   - DC cabling
 *   - Inverter efficiency
 *   - AC cabling
 *   - Transformer
 *   - Availability (arıza/bakım kesintisi)
 *   - Aging (LID + degradasyon yıl 1 hariç)
 *
 * Toplam kayıp = 1 - Π(1 - loss_i) (her kalem multiplicative)
 */

export interface LossBreakdown {
  soilingPct: number;          // %2 default (yıllık ortalama)
  iamPct: number;              // %2 (açısal yansıma)
  spectralPct: number;         // %0.5
  temperaturePct: number;      // %5 (Türkiye için yaz pikleri)
  mismatchPct: number;         // %1
  dcCablingPct: number;        // %1
  inverterPct: number;         // %2
  acCablingPct: number;        // %1
  transformerPct: number;      // %1 (OG bağlı varsa)
  availabilityPct: number;     // %0.5
}

export const DEFAULT_LOSSES: LossBreakdown = {
  soilingPct: 2.0,
  iamPct: 2.0,
  spectralPct: 0.5,
  temperaturePct: 5.0,
  mismatchPct: 1.0,
  dcCablingPct: 1.0,
  inverterPct: 2.0,
  acCablingPct: 1.0,
  transformerPct: 1.0,
  availabilityPct: 0.5,
};

export interface LossesResult {
  /** Her kayıp adımının yüzdesi */
  steps: Array<{ name: string; pct: number; remaining: number }>;
  /** Toplam kayıp yüzdesi (PVGIS 'loss' parametresine eş) */
  totalLossPct: number;
  /** Verim katsayısı (1 - toplam kayıp) */
  yieldFactor: number;
}

/**
 * Multiplicative loss zinciri:
 * each: remaining = remaining × (1 - loss/100)
 * total = 1 - remaining
 */
export function computeLosses(b: LossBreakdown): LossesResult {
  const order: Array<{ key: keyof LossBreakdown; name: string }> = [
    { key: 'soilingPct', name: 'Kirlilik (Soiling)' },
    { key: 'iamPct', name: 'IAM (Açısal Yansıma)' },
    { key: 'spectralPct', name: 'Spektral' },
    { key: 'temperaturePct', name: 'Sıcaklık' },
    { key: 'mismatchPct', name: 'Modül Mismatch' },
    { key: 'dcCablingPct', name: 'DC Kablo' },
    { key: 'inverterPct', name: 'İnvertör Verimi' },
    { key: 'acCablingPct', name: 'AC Kablo' },
    { key: 'transformerPct', name: 'Trafo' },
    { key: 'availabilityPct', name: 'Müsait Olmama' },
  ];

  let remaining = 1.0;
  const steps: LossesResult['steps'] = [];
  for (const o of order) {
    const lossPct = b[o.key];
    remaining *= 1 - lossPct / 100;
    steps.push({ name: o.name, pct: lossPct, remaining });
  }

  const totalLossPct = (1 - remaining) * 100;
  return {
    steps,
    totalLossPct,
    yieldFactor: remaining,
  };
}

// ---------- Modül + İnvertör kütüphanesi ----------

export interface ModuleSpec {
  brand: string;
  model: string;
  wp: number;
  efficiency: number; // 0..1
  vmp: number;        // V
  imp: number;        // A
  voc: number;
  isc: number;
  tempCoeffPmaxPctPerC: number; // örn -0.34
  bifacial: boolean;
}

export const MODULE_LIBRARY: ModuleSpec[] = [
  { brand: 'JinkoSolar', model: 'Tiger Neo N-type 580W', wp: 580, efficiency: 0.224, vmp: 43.5, imp: 13.34, voc: 51.7, isc: 14.04, tempCoeffPmaxPctPerC: -0.29, bifacial: true },
  { brand: 'LONGi', model: 'Hi-MO 7 LR5-72HTH-580M', wp: 580, efficiency: 0.225, vmp: 43.8, imp: 13.24, voc: 52.1, isc: 13.96, tempCoeffPmaxPctPerC: -0.28, bifacial: true },
  { brand: 'Trina Solar', model: 'Vertex N TSM-NEG21C.20 620W', wp: 620, efficiency: 0.230, vmp: 45.2, imp: 13.71, voc: 53.8, isc: 14.30, tempCoeffPmaxPctPerC: -0.30, bifacial: true },
  { brand: 'Canadian Solar', model: 'TOPHiKu7 595W', wp: 595, efficiency: 0.226, vmp: 44.0, imp: 13.52, voc: 52.4, isc: 14.18, tempCoeffPmaxPctPerC: -0.29, bifacial: false },
  { brand: 'JA Solar', model: 'DeepBlue 4.0 Pro 575W', wp: 575, efficiency: 0.223, vmp: 43.1, imp: 13.34, voc: 51.3, isc: 13.95, tempCoeffPmaxPctPerC: -0.30, bifacial: false },
];

export interface InverterSpec {
  brand: string;
  model: string;
  acKw: number;
  maxDcKw: number;
  efficiencyEur: number;     // 0..1
  mpptCount: number;
  maxInputVdc: number;
  type: 'string' | 'central';
}

export const INVERTER_LIBRARY: InverterSpec[] = [
  { brand: 'Huawei', model: 'SUN2000-100KTL-M2', acKw: 100, maxDcKw: 130, efficiencyEur: 0.985, mpptCount: 10, maxInputVdc: 1100, type: 'string' },
  { brand: 'Sungrow', model: 'SG125HV', acKw: 125, maxDcKw: 162, efficiencyEur: 0.988, mpptCount: 10, maxInputVdc: 1500, type: 'string' },
  { brand: 'SMA', model: 'Sunny Tripower CORE2 110-US', acKw: 110, maxDcKw: 143, efficiencyEur: 0.983, mpptCount: 12, maxInputVdc: 1100, type: 'string' },
  { brand: 'Huawei', model: 'SUN2000-215KTL-H3', acKw: 215, maxDcKw: 280, efficiencyEur: 0.988, mpptCount: 16, maxInputVdc: 1500, type: 'string' },
  { brand: 'Sungrow', model: 'SG3125HV-MV (central)', acKw: 3125, maxDcKw: 4062, efficiencyEur: 0.990, mpptCount: 1, maxInputVdc: 1500, type: 'central' },
];
