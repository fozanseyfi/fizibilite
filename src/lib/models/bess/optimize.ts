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

export function optimizeBessCi(base: BessCiInputs, sizes: number[], cRates: number[]): OptRow[] {
  const rows: OptRow[] = [];
  for (const cap of sizes) for (const c of cRates) {
    const m = computeBessCi({ ...base, bKwh: cap, cRate: c });
    rows.push({ cap, c, power: m.bKw, capex: m.capex, npv: m.npv, irr: m.irr, payback: m.payback,
      y1: m.y1.self + m.y1.arb + m.y1.peak + m.y1.backup, sohOk: m.soh.ok });
  }
  return rows.sort((a, b) => b.npv - a.npv);
}

export function optimizeBessUtility(base: BessUtilityInputs, sizes: number[], cRates: number[]): OptRow[] {
  const rows: OptRow[] = [];
  for (const cap of sizes) for (const c of cRates) {
    const m = computeBessUtility({ ...base, bMwh: cap, cRate: c });
    rows.push({ cap, c, power: m.bMw, capex: m.capex, npv: m.npv, irr: m.irr, payback: m.payback,
      y1: m.years[0]?.revUsd ?? 0, sohOk: m.soh.ok });
  }
  return rows.sort((a, b) => b.npv - a.npv);
}
