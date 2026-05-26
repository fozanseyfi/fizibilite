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
  // --------- JinkoSolar (Tier-1 Çin) ---------
  { brand: 'JinkoSolar', model: 'JKM-625N-78HL4-BDV (Tiger Neo)', wp: 625, efficiency: 0.224, vmp: 35.6, imp: 17.56, voc: 42.6, isc: 18.32, tempCoeffPmaxPctPerC: -0.29, bifacial: true },
  { brand: 'JinkoSolar', model: 'Tiger Neo N-type 580W', wp: 580, efficiency: 0.224, vmp: 43.5, imp: 13.34, voc: 51.7, isc: 14.04, tempCoeffPmaxPctPerC: -0.29, bifacial: true },
  { brand: 'JinkoSolar', model: 'Tiger Neo 78HL4M 605W', wp: 605, efficiency: 0.228, vmp: 44.5, imp: 13.60, voc: 52.6, isc: 14.30, tempCoeffPmaxPctPerC: -0.29, bifacial: true },
  // --------- LONGi (Tier-1 Çin) ---------
  { brand: 'LONGi', model: 'Hi-MO 7 LR5-72HTH-580M', wp: 580, efficiency: 0.225, vmp: 43.8, imp: 13.24, voc: 52.1, isc: 13.96, tempCoeffPmaxPctPerC: -0.28, bifacial: true },
  { brand: 'LONGi', model: 'Hi-MO X6 LR5-66HTH-560M', wp: 560, efficiency: 0.222, vmp: 41.3, imp: 13.57, voc: 49.1, isc: 14.27, tempCoeffPmaxPctPerC: -0.29, bifacial: true },
  { brand: 'LONGi', model: 'Hi-MO 9 LR8-66HGD-625M', wp: 625, efficiency: 0.234, vmp: 44.2, imp: 14.15, voc: 53.0, isc: 14.95, tempCoeffPmaxPctPerC: -0.26, bifacial: true },
  // --------- Trina Solar ---------
  { brand: 'Trina Solar', model: 'Vertex N TSM-NEG21C.20 620W', wp: 620, efficiency: 0.230, vmp: 45.2, imp: 13.71, voc: 53.8, isc: 14.30, tempCoeffPmaxPctPerC: -0.30, bifacial: true },
  { brand: 'Trina Solar', model: 'Vertex S+ NEG9R.28 450W', wp: 450, efficiency: 0.224, vmp: 34.0, imp: 13.24, voc: 41.2, isc: 13.98, tempCoeffPmaxPctPerC: -0.30, bifacial: false },
  // --------- Canadian Solar ---------
  { brand: 'Canadian Solar', model: 'TOPHiKu7 CS7N-660TB-AG (660 W)', wp: 660, efficiency: 0.213, vmp: 38.6, imp: 17.10, voc: 46.4, isc: 18.05, tempCoeffPmaxPctPerC: -0.29, bifacial: true },
  { brand: 'Canadian Solar', model: 'BiHiKu6 CS6W-555MB-AG 555W', wp: 555, efficiency: 0.216, vmp: 41.8, imp: 13.28, voc: 50.1, isc: 14.04, tempCoeffPmaxPctPerC: -0.30, bifacial: true },
  // --------- JA Solar ---------
  { brand: 'JA Solar', model: 'DeepBlue 4.0 Pro JAM72D40 580W', wp: 580, efficiency: 0.224, vmp: 43.3, imp: 13.40, voc: 51.6, isc: 14.05, tempCoeffPmaxPctPerC: -0.30, bifacial: true },
  { brand: 'JA Solar', model: 'DeepBlue 4.0 JAM78D40 615W', wp: 615, efficiency: 0.221, vmp: 46.6, imp: 13.20, voc: 55.4, isc: 13.87, tempCoeffPmaxPctPerC: -0.30, bifacial: true },
  // --------- Risen / GCL / DAS Solar (yedek tier-1) ---------
  { brand: 'Risen Energy', model: 'RSM144-9 580W', wp: 580, efficiency: 0.223, vmp: 43.0, imp: 13.49, voc: 51.5, isc: 14.18, tempCoeffPmaxPctPerC: -0.30, bifacial: false },
  { brand: 'DAS Solar', model: 'DAS-DH144NA 580W', wp: 580, efficiency: 0.224, vmp: 43.5, imp: 13.34, voc: 51.7, isc: 14.04, tempCoeffPmaxPctPerC: -0.29, bifacial: true },
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
  // --------- Sungrow String (1100V) ---------
  { brand: 'Sungrow', model: 'SG33CX (33 kW, 1100V)', acKw: 33, maxDcKw: 50, efficiencyEur: 0.985, mpptCount: 3, maxInputVdc: 1100, type: 'string' },
  { brand: 'Sungrow', model: 'SG110CX (110 kW, 1100V)', acKw: 110, maxDcKw: 165, efficiencyEur: 0.988, mpptCount: 9, maxInputVdc: 1100, type: 'string' },
  // --------- Sungrow String (1500V) ---------
  { brand: 'Sungrow', model: 'SG125HV (125 kW, 1500V)', acKw: 125, maxDcKw: 187, efficiencyEur: 0.988, mpptCount: 10, maxInputVdc: 1500, type: 'string' },
  { brand: 'Sungrow', model: 'SG250HX (250 kW, 1500V)', acKw: 250, maxDcKw: 375, efficiencyEur: 0.989, mpptCount: 12, maxInputVdc: 1500, type: 'string' },
  { brand: 'Sungrow', model: 'SG320HX (320 kW, 1500V)', acKw: 320, maxDcKw: 480, efficiencyEur: 0.990, mpptCount: 12, maxInputVdc: 1500, type: 'string' },
  { brand: 'Sungrow', model: 'SG350HX (350 kW, 1500V)', acKw: 350, maxDcKw: 525, efficiencyEur: 0.990, mpptCount: 12, maxInputVdc: 1500, type: 'string' },
  // --------- Sungrow Central (MW seviyesi) ---------
  { brand: 'Sungrow', model: 'SG3125HV-MV (3125 kW)', acKw: 3125, maxDcKw: 4062, efficiencyEur: 0.990, mpptCount: 1, maxInputVdc: 1500, type: 'central' },
  { brand: 'Sungrow', model: 'SG4400UD (4400 kW, 1500V)', acKw: 4400, maxDcKw: 5060, efficiencyEur: 0.989, mpptCount: 1, maxInputVdc: 1500, type: 'central' },
  { brand: 'Sungrow', model: 'SG6800HV-MV (6800 kW)', acKw: 6800, maxDcKw: 9200, efficiencyEur: 0.990, mpptCount: 1, maxInputVdc: 1500, type: 'central' },

  // --------- Huawei String (1100V) ---------
  { brand: 'Huawei', model: 'SUN2000-30KTL-M3 (30 kW)', acKw: 30, maxDcKw: 45, efficiencyEur: 0.984, mpptCount: 4, maxInputVdc: 1100, type: 'string' },
  { brand: 'Huawei', model: 'SUN2000-50KTL-M3 (50 kW)', acKw: 50, maxDcKw: 75, efficiencyEur: 0.985, mpptCount: 6, maxInputVdc: 1100, type: 'string' },
  { brand: 'Huawei', model: 'SUN2000-100KTL-M2 (100 kW)', acKw: 100, maxDcKw: 150, efficiencyEur: 0.986, mpptCount: 10, maxInputVdc: 1100, type: 'string' },
  // --------- Huawei String (1500V) ---------
  { brand: 'Huawei', model: 'SUN2000-185KTL-INH1 (185 kW)', acKw: 185, maxDcKw: 278, efficiencyEur: 0.989, mpptCount: 9, maxInputVdc: 1500, type: 'string' },
  { brand: 'Huawei', model: 'SUN2000-215KTL-H3 (215 kW)', acKw: 215, maxDcKw: 280, efficiencyEur: 0.989, mpptCount: 16, maxInputVdc: 1500, type: 'string' },
  { brand: 'Huawei', model: 'SUN2000-330KTL-H1 (330 kW)', acKw: 330, maxDcKw: 470, efficiencyEur: 0.990, mpptCount: 12, maxInputVdc: 1500, type: 'string' },
  // --------- Huawei Central ---------
  { brand: 'Huawei', model: 'SUN2000-2000-CG2 (2 MW central)', acKw: 2000, maxDcKw: 2600, efficiencyEur: 0.990, mpptCount: 1, maxInputVdc: 1500, type: 'central' },

  // --------- SMA String + Central ---------
  { brand: 'SMA', model: 'Sunny Tripower CORE2 110-US', acKw: 110, maxDcKw: 143, efficiencyEur: 0.983, mpptCount: 12, maxInputVdc: 1100, type: 'string' },
  { brand: 'SMA', model: 'Sunny Highpower PEAK3 (150 kW)', acKw: 150, maxDcKw: 225, efficiencyEur: 0.989, mpptCount: 12, maxInputVdc: 1500, type: 'string' },
  { brand: 'SMA', model: 'Sunny Central UP-S 4400 (4.4 MW)', acKw: 4400, maxDcKw: 5700, efficiencyEur: 0.989, mpptCount: 1, maxInputVdc: 1500, type: 'central' },

  // --------- Fronius + Power Electronics + GoodWe ---------
  { brand: 'Fronius', model: 'Tauro ECO 100-3-D (100 kW)', acKw: 100, maxDcKw: 153, efficiencyEur: 0.984, mpptCount: 3, maxInputVdc: 1000, type: 'string' },
  { brand: 'Power Electronics', model: 'FS3850K (3.85 MW central)', acKw: 3850, maxDcKw: 5005, efficiencyEur: 0.990, mpptCount: 1, maxInputVdc: 1500, type: 'central' },
  { brand: 'GoodWe', model: 'GW250K-HT (250 kW)', acKw: 250, maxDcKw: 375, efficiencyEur: 0.989, mpptCount: 12, maxInputVdc: 1500, type: 'string' },
];
