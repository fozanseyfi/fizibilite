// Sağlık şartı stratejileri: kapasite şartını (ör. 5. yıl %90, 10. yıl %80) karşılamanın
// farklı yolları ekonomik olarak karşılaştırılır:
//  - Baştan kapasite fazlası (hiç ekleme yapmadan şartı sağlayacak kadar fazla kWh)
//  - N. yılda kapasite ekleme (+ gerekirse N'den önceki şartlar için küçük bir kapasite fazlası)
// Her satır tam modelle hesaplanır.

import { computeBessCi, type BessCiInputs } from './ci';
import { computeBessUtility, type BessUtilityInputs } from './utility';
import { sohReqsOf, type SohReq } from './common';

export interface StratRow {
  /** 0 = ekleme yok */
  augYear: number;
  /** Şartı sağlayan en küçük kapasite fazlası (%) */
  oversizePct: number;
  capex: number;
  /** Ekleme yılında harcanan tutar (USD, nominal) */
  augUsd: number;
  npv: number; irr: number; payback: number;
  sohOk: boolean;
  label: string;
}

/**
 * Verilen ekleme yılı için şartları sağlayan en küçük kapasite fazlası (oran, ≥0).
 * Sağlık: over × (1 − kayıp)^yaş; ekleme yılında yaş sıfırlanır.
 */
export function minOversize(degr: number, augYear: number, reqs: SohReq[], life: number): number {
  let need = 1;
  for (const r of reqs) {
    if (r.year <= 0 || r.pct <= 0 || r.year > life) continue;
    const age = augYear > 0 && r.year >= augYear ? r.year - augYear + 1 : r.year;
    need = Math.max(need, r.pct / 100 / Math.pow(1 - degr, age));
  }
  return Math.max(0, Math.ceil((need - 1) * 200 - 1e-9) / 200); // %0,5 adımla yukarı yuvarla (−0 değil)
}

const labelOf = (augYear: number, over: number) =>
  (augYear === 0 ? 'Baştan kapasite fazlası (ekleme yok)' : `${augYear}. yılda kapasite ekleme`)
  + (augYear > 0 && over > 0 ? ` + %${(over * 100).toFixed(1).replace('.', ',')} fazla` : '');

function run<I extends { life: number; bDegr: number; augYear: number; oversize?: number }>(
  i: I,
  compute: (x: I) => { capex: number; npv: number; irr: number; payback: number; soh: { ok: boolean }; years: { augUsd: number }[] },
): StratRow[] {
  const reqs = sohReqsOf(i as never);
  const degr = i.bDegr / 100;
  const years = [0, ...Array.from({ length: Math.max(0, i.life - 1) }, (_, k) => k + 2)];
  const rows = years.map((augYear) => {
    const over = minOversize(degr, augYear, reqs, i.life);
    const m = compute({ ...i, augYear, oversize: over * 100 });
    return {
      augYear, oversizePct: over * 100, capex: m.capex,
      augUsd: m.years.reduce((s, y) => s + y.augUsd, 0),
      npv: m.npv, irr: m.irr, payback: m.payback, sohOk: m.soh.ok, label: labelOf(augYear, over),
    };
  });
  return rows.sort((a, b) => b.npv - a.npv);
}

export const sohStrategiesCi = (i: BessCiInputs) => run(i, computeBessCi);
export const sohStrategiesUtility = (i: BessUtilityInputs) => run(i, computeBessUtility);
