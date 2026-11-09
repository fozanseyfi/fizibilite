// Batarya boyutu optimizasyonu: kapasite × C-oranı ızgarasında her kombinasyon
// tam modelle (aynı kullanım şekilleri ve fiyat varsayımlarıyla) hesaplanır, NPV'ye göre sıralanır.

import { computeBessCi, type BessCiInputs } from './ci';
import { computeBessUtility, type BessUtilityInputs } from './utility';

export interface OptRow {
  /** Kapasite (C&I: kWh, Utility: MWh) */
  cap: number;
  c: number;
  /** Güç (C&I: kW, Utility: MW) */
  power: number;
  capex: number; npv: number; irr: number; payback: number;
  /** 1. yıl kazanç (C&I: TL) / gelir (Utility: USD) */
  y1: number;
  sohOk: boolean;
  /** Güç şebeke bağlantı gücünü aşıyor (yalnız utility) */
  overGrid?: boolean;
}

/** min–max arasında `steps` adet "yuvarlak" kapasite değeri */
export function sizeGrid(min: number, max: number, steps: number): number[] {
  const lo = Math.max(0, Math.min(min, max)), hi = Math.max(min, max);
  const n = Math.max(2, Math.min(20, Math.round(steps)));
  const raw = Array.from({ length: n }, (_, k) => lo + ((hi - lo) * k) / (n - 1));
  const nice = (v: number) => {
    if (v <= 0) return 0;
    const mag = Math.pow(10, Math.floor(Math.log10(v)) - 1);
    return Math.round(v / mag) * mag;
  };
  return [...new Set(raw.map(nice).filter((v) => v > 0))];
}

/** C&I boyut optimizasyonu — maliyet tek kalem; diğer C-oranları güç farkı × cPremium ($/kW) ile fiyatlanır (bkz. utility). */
export function optimizeBessCi(base: BessCiInputs, sizes: number[], cRates: number[], cPremium = 0): OptRow[] {
  const rows: OptRow[] = [];
  const baseKw = base.cRate > 0 ? base.bKwh * base.cRate : base.bKw;
  const baseC = base.bKwh > 0 ? baseKw / base.bKwh : 0.5;
  for (const cap of sizes) for (const c of cRates) {
    const m = computeBessCi({ ...base, bKwh: cap, cRate: c, capexKwh: Math.max(0, base.capexKwh + cPremium * (c - baseC)) });
    rows.push({ cap, c, power: m.bKw, capex: m.capex, npv: m.npv, irr: m.irr, payback: m.payback,
      y1: m.y1.self + m.y1.arb + m.y1.peak + m.y1.backup, sohOk: true }); // C&I'da sağlık şartı yok
  }
  return rows.sort((a, b) => b.npv - a.npv);
}

/**
 * Utility boyut optimizasyonu.
 * - Kurulum maliyeti tek kalemdir ($/kWh) ve girilen fiyat mevcut C-oranı içindir. Diğer C-oranları için
 *   güç tarafı farkı eklenir/düşülür: $/kWh' = $/kWh + cPremium × (C − C_mevcut)  (cPremium: $/kW güç).
 * - Yan hizmet açıksa ayrılan güç, MW olarak değil güç PAYI olarak korunur (güç büyüdükçe yan hizmet de büyür).
 */
export function optimizeBessUtility(base: BessUtilityInputs, sizes: number[], cRates: number[], cPremium = 0): OptRow[] {
  const rows: OptRow[] = [];
  const baseMw = base.cRate > 0 ? base.bMwh * base.cRate : base.bMw;
  const baseC = base.bMwh > 0 ? baseMw / base.bMwh : 0.5;
  const ancShare = base.useAnc && baseMw > 0 ? Math.min(1, base.ancMw / baseMw) : 0;
  for (const cap of sizes) for (const c of cRates) {
    const m = computeBessUtility({
      ...base, bMwh: cap, cRate: c,
      capexKwh: Math.max(0, base.capexKwh + cPremium * (c - baseC)),
      ancMw: ancShare * cap * c,
    });
    rows.push({ cap, c, power: m.bMw, capex: m.capex, npv: m.npv, irr: m.irr, payback: m.payback,
      y1: m.years[0]?.revUsd ?? 0, sohOk: m.soh.ok, overGrid: m.bMw > base.acMw * 1.001 });
  }
  return rows.sort((a, b) => b.npv - a.npv);
}
