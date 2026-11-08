// Kullanım analizi: bataryanın NASIL kullanılacağına dair senaryolar.
// Her satır tam modelle (saatlik simülasyon, tüm yıllar) hesaplanır; yalnızca ilgili varsayım değişir.

import { computeBessCi, type BessCiInputs } from './ci';
import { clipFraction, computeBessUtility, type BessUtilityInputs } from './utility';
import { pvSum } from './common';

export interface ComboRow {
  /** Kombinasyondaki kullanım şekilleri (anahtar) */
  uses: string[];
  npv: number; irr: number; payback: number;
  /** 1. yıl kazanç / gelir (C&I: TL, Utility: USD) */
  y1: number;
}

export interface ComboResult {
  rows: ComboRow[];
  /** Seçili tüm kullanımlardan biri çıkarılınca NPV'nin ne kadar düştüğü (marjinal katkı, USD) */
  marginal: { use: string; npv: number }[];
}

/** Boş olmayan tüm alt kümeler */
function subsets<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let mask = 1; mask < 1 << items.length; mask++) out.push(items.filter((_, i) => mask & (1 << i)));
  return out;
}

function combos<K extends string>(
  available: K[],
  run: (on: Set<K>) => Omit<ComboRow, 'uses'>,
): ComboResult {
  const rows = subsets(available).map((uses) => ({ uses, ...run(new Set(uses)) }));
  rows.sort((a, b) => b.npv - a.npv);
  const all = rows.find((r) => r.uses.length === available.length);
  const marginal = all && available.length > 1
    ? available.map((u) => {
        const without = rows.find((r) => r.uses.length === available.length - 1 && !r.uses.includes(u));
        return { use: u, npv: all.npv - (without?.npv ?? 0) };
      })
    : [];
  return { rows, marginal };
}

// ============================ C&I ============================

export type CiUse = 'self' | 'arb' | 'peak' | 'backup';

/** Abone ve tarifeye göre anlamlı kullanım şekilleri */
export function ciAvailableUses(i: BessCiInputs): CiUse[] {
  const u: CiUse[] = ['self'];
  if (i.tariff === 'uc') u.push('arb');
  if (i.abone !== 'mesken') u.push('peak');
  u.push('backup');
  return u;
}

export function ciUseCombos(i: BessCiInputs): ComboResult {
  return combos(ciAvailableUses(i), (on) => {
    const m = computeBessCi({ ...i, useSelf: on.has('self'), useArb: on.has('arb'), usePeak: on.has('peak'), useBackup: on.has('backup') });
    return { npv: m.npv, irr: m.irr, payback: m.payback, y1: m.y1.self + m.y1.arb + m.y1.peak + m.y1.backup };
  });
}

// ============================ UTILITY ============================

export type UtUse = 'clip' | 'arb' | 'anc' | 'imb';

export function utUseCombos(i: BessUtilityInputs): ComboResult {
  return combos<UtUse>(['clip', 'arb', 'anc', 'imb'], (on) => {
    const m = computeBessUtility({ ...i, useClip: on.has('clip'), useArb: on.has('arb'), useAnc: on.has('anc'), useImb: on.has('imb') });
    return { npv: m.npv, irr: m.irr, payback: m.payback, y1: m.years[0]?.revUsd ?? 0 };
  });
}

export interface YekdemRow {
  years: number;
  /** Santralin bataryasız gelirinin bugünkü değeri (USD) */
  plantNpv: number;
  /** Bataryanın NPV'si (yatırım dahil) */
  bessNpv: number;
  /** Santral geliri + batarya NPV */
  totalNpv: number;
}

/**
 * YEKDEM'de kalma süresi taraması: 0 (hemen serbest piyasa) … ömür.
 * YEKDEM'den çıkmak yalnızca bataryayı değil TÜM santral gelirini etkiler; bu yüzden
 * santral geliri + batarya NPV birlikte karşılaştırılır. Santral işletme gideri her
 * senaryoda aynı olduğundan karşılaştırmaya girmez.
 */
export function yekdemSweep(i: BessUtilityInputs, disc: number): YekdemRow[] {
  const rows: YekdemRow[] = [];
  for (let yy = 0; yy <= i.life; yy++) {
    const m = computeBessUtility({ ...i, regime: 'yekdem', yekdemYears: yy });
    const plantNpv = pvSum(m.years.map((y) => y.plantUsd), disc);
    rows.push({ years: yy, plantNpv, bessNpv: m.npv, totalNpv: plantNpv + m.npv });
  }
  return rows;
}

export interface AncCell { mwShare: number; mw: number; priceFactor: number; price: number; npv: number }

/** Yan hizmet: ayrılan güç payı × fiyat seviyesi matrisi (yan hizmet açık kabul edilir) */
export function ancSweep(i: BessUtilityInputs, bMw: number): AncCell[] {
  const shares = [0, 0.25, 0.5, 0.75, 1];
  const factors = [0.25, 0.5, 1, 1.5];
  const out: AncCell[] = [];
  for (const f of factors) for (const s of shares) {
    const mw = bMw * s;
    const m = computeBessUtility({ ...i, useAnc: s > 0, ancMw: mw, ancPrice: i.ancPrice * f });
    out.push({ mwShare: s, mw, priceFactor: f, price: i.ancPrice * f, npv: m.npv });
  }
  return out;
}

export interface ArbRow { factor: number; spread: number; ptfPeak: number; arbNpvUsd: number; npv: number; firstMerchantArb: number }

/**
 * Arbitraj: puant–öğle fiyat farkı duyarlılığı. Öğle fiyatı sabit, puant fiyatı
 * öğle + fark × çarpan olarak değişir. Arbitraj kullanımı açık kabul edilir.
 */
export function arbSweep(i: BessUtilityInputs, disc: number): ArbRow[] {
  const base = Math.max(0, i.ptfPeak - i.ptfNoon);
  return [0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((f) => {
    const ptfPeak = i.ptfNoon + base * f;
    const m = computeBessUtility({ ...i, useArb: true, ptfPeak });
    const fm = m.years.find((y) => !y.yekdem);
    return { factor: f, spread: base * f, ptfPeak, arbNpvUsd: pvSum(m.years.map((y) => y.arbUsd), disc), npv: m.npv, firstMerchantArb: fm?.arbUsd ?? 0 };
  });
}

/** Sıfır NPV'yi geçen fark (doğrusal ara değer); yoksa null */
export function breakevenSpread(rows: ArbRow[]): number | null {
  for (let k = 1; k < rows.length; k++) {
    const a = rows[k - 1], b = rows[k];
    if (a.npv < 0 && b.npv >= 0) return a.spread + ((b.spread - a.spread) * -a.npv) / (b.npv - a.npv);
  }
  return rows[0] && rows[0].npv >= 0 ? rows[0].spread : null;
}

export interface DcRow {
  addPct: number; dcMwp: number; ratio: number;
  /** Bu senaryoda kullanılan kırpma oranı (%) */
  clipPct: number;
  addCapex: number;
  /** Santral satış geliri bugünkü değeri (bataryasız) */
  plantNpv: number;
  bessNpv: number;
  /** Mevcut duruma göre fark — ek panel yatırımı düşülmüş */
  deltaNoBess: number;
  deltaWithBess: number;
}

/**
 * DC (panel) gücünü artırma senaryoları — AC / lisans gücü sabit.
 * Kırpma oranı: girilen değer + gün tipi modelinin öngördüğü ARTIŞ.
 * Ek panelin işletme gideri dahil değildir (küçük; not olarak belirtilir).
 */
export function dcSweep(i: BessUtilityInputs, disc: number, pvCapexKwp: number, steps = [0, 10, 20, 30, 40, 50]): DcRow[] {
  const auto0 = clipFraction(i.dcMwp, i.acMw, i.spec);
  const raw = steps.map((pctAdd) => {
    const dcMwp = i.dcMwp * (1 + pctAdd / 100);
    const clipPct = Math.min(30, Math.max(0, i.clipPct + (clipFraction(dcMwp, i.acMw, i.spec) - auto0) * 100));
    const m = computeBessUtility({ ...i, dcMwp, clipPct });
    return {
      addPct: pctAdd, dcMwp, ratio: dcMwp / i.acMw, clipPct,
      addCapex: (dcMwp - i.dcMwp) * 1000 * pvCapexKwp,
      plantNpv: pvSum(m.years.map((y) => y.plantUsd), disc),
      bessNpv: m.npv,
    };
  });
  const b = raw[0];
  return raw.map((r) => ({
    ...r,
    deltaNoBess: r.plantNpv - b.plantNpv - r.addCapex,
    deltaWithBess: r.plantNpv + r.bessNpv - (b.plantNpv + b.bessNpv) - r.addCapex,
  }));
}
