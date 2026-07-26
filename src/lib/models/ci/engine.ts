// C&I / Mesken (Saatlik Mahsuplaşma) modeli — hesap motoru.
// Kaynak: "C&I Saatlik Mahsuplaşma Fizibilite Kokpiti — EPDK 14531" HTML'inin JS motoru.
// Matematik birebir korunmuştur; yalnızca TypeScript tipleri eklenmiştir.

import { SOLAR_M, SUN_S, SUN_EW, DAYS, norm } from './presets';

// ============================ INPUTS ============================
export interface CiInputs {
  pname: string;
  prep: string;
  firm?: string;   // firma adı (raporda görünür)
  loc?: string;    // lokasyon (raporda görünür)

  abone: 'ci' | 'mesken';
  consY: number;      // yıllık tüketim (kWh)
  consPrev: number;   // önceki yıl tüketimi (kWh)

  monthly: number[];  // 12 aylık dağılım (%)
  wd: number[];       // hafta içi 24 saatlik dağılım (%)
  we: number[];       // hafta sonu 24 saatlik dağılım (%)
  weRatio: number;    // hafta sonu / hafta içi (%)

  // profil/mevsim seçimi (yalnız form/grafik bağlamı, matematiğe girmez)
  profileId: string;
  season: string;

  kwp: number;
  spec: number;
  orient: 's' | 'ew';
  degr: number;       // (%/yıl)
  life: number;

  skb: number;        // limit üstü SKB (TL/kWh)

  pBuy: number;       // alış (TL/kWh)
  pSell: number;      // satış (TL/kWh)
  esc1: number;       // TL enflasyonu ilk 5 yıl (%)
  esc2: number;       // sonrası (%)
  preal: number;      // reel artış (%)
  fx0: number;
  piUS: number;       // USD enflasyonu (%)
  fxMode: 'ppp' | 'man';
  fxMan: number;

  bessOn: boolean;
  bKwh: number;
  bKw: number;
  bRte: number;       // (%)
  bDegr: number;      // (%/yıl)
  bCapex: number;     // ($/kWh)
  bOpex: number;      // (TL/kWh-yıl)

  capexU: number;     // ($/kWp)
  opexU: number;      // (TL/kWp-yıl)
  r: number;          // iskonto (%)

  lOn: boolean;
  lRatio: number;     // (%)
  lRate: number;      // (%)
  lTerm: number;      // (yıl)
}

interface CParams {
  pname: string; prep: string;
  abone: 'ci' | 'mesken'; consY: number; consPrev: number;
  mPct: number[]; weRatio: number; wd: number[]; we: number[];
  kwp: number; spec: number; orient: 's' | 'ew'; degr: number; life: number;
  skb: number;
  pBuy: number; pSell: number; esc1: number; esc2: number; preal: number;
  fx0: number; piUS: number; fxMode: 'ppp' | 'man'; fxMan: number;
  bessOn: boolean; bKwh: number; bKw: number; bRte: number; bDegr: number; bCapex: number; bOpex: number;
  capexU: number; opexU: number; r: number;
  lOn: boolean; lRatio: number; lRate: number; lTerm: number;
}

// ---- Ay içi üretim eğimi (aylık ortalamalar arası interpolasyon) ----
const DAYF: number[][] = (() => {
  const V = SOLAR_M.map((s, i) => s / DAYS[i]);
  const cum = [0];
  for (let i = 0; i < 12; i++) cum.push(cum[i] + DAYS[i]);
  const C = V.map((_, i) => cum[i] + DAYS[i] / 2);
  const interp = (x: number): number => {
    for (let i = 0; i < 12; i++) {
      const c1 = C[i], c2 = i < 11 ? C[i + 1] : C[0] + 365;
      const xx = x < C[0] ? x + 365 : x;
      if (xx >= c1 && xx < c2) {
        const a = i, b = (i + 1) % 12;
        return V[a] + (V[b] - V[a]) * (xx - c1) / (c2 - c1);
      }
    }
    return V[0];
  };
  return SOLAR_M.map((_, mi) => {
    const raw: number[] = [];
    for (let d = 0; d < DAYS[mi]; d++) raw.push(interp(cum[mi] + d + 0.5));
    const mean = raw.reduce((a, b) => a + b, 0) / DAYS[mi];
    return raw.map((v) => v / mean);
  });
})();

// ============================ CORE ENERGY ============================
function dailyProd(p: CParams, m: number, scale: number): number[] {
  const sun = norm(p.orient === 'ew' ? SUN_EW : SUN_S);
  const mProd = (p.kwp * p.spec * SOLAR_M[m]) / 100 * scale;
  const dProd = mProd / DAYS[m];
  return sun.map((s) => s * dProd);
}
function monthCons(p: CParams, mi: number): number {
  return (p.consY * p.mPct[mi]) / 100;
}
function calDays(mi: number): { wd: number; we: number } {
  let wd = 0, we = 0;
  for (let d = 0; d < DAYS[mi]; d++) (d % 7 >= 5 ? we++ : wd++);
  return { wd, we };
}
function dayCons(p: CParams, mi: number, dt: 'wd' | 'we'): number[] {
  const { wd, we } = calDays(mi);
  const Cm = monthCons(p, mi);
  const Dwd = Cm / (wd + we * p.weRatio);
  const Dday = dt === 'wd' ? Dwd : Dwd * p.weRatio;
  const shape = dt === 'wd' ? p.wd : p.we;
  return shape.map((s) => (Dday * s) / 100);
}

interface DayTrack {
  prod: number[]; cons: number[]; mah: number[]; ch: number[]; dch: number[]; faz: number[]; cek: number[];
}
interface Bess { cap: number; kw: number; rte: number; }

function hourlyNet(prod: number[], cons: number[], bess: Bess | null, track?: DayTrack): { mah: number; faz: number; cek: number; shift: number } {
  let mah = 0, faz = 0, cek = 0, shift = 0;
  const exc: number[] = [], deficit: number[] = [], mahH: number[] = [], chH = Array(24).fill(0), dchH = Array(24).fill(0);
  for (let h = 0; h < 24; h++) {
    const mm = Math.min(prod[h], cons[h]);
    mahH[h] = mm;
    mah += mm; exc[h] = prod[h] - mm; deficit[h] = cons[h] - mm;
  }
  if (bess && bess.cap > 0) {
    let defCap = 0, excCap = 0;
    for (let h = 0; h < 24; h++) { defCap += Math.min(deficit[h], bess.kw); excCap += Math.min(exc[h], bess.kw); }
    const target = Math.min(bess.cap, excCap, defCap / bess.rte);
    let soc = 0;
    for (let h = 0; h < 24; h++) {
      const c = Math.min(exc[h], bess.kw, target - soc);
      if (c > 0) { soc += c; exc[h] -= c; chH[h] += c; }
    }
    for (let pass = 0; pass < 2 && soc > 1e-9; pass++) {
      for (let h = 0; h < 24; h++) {
        if (soc <= 1e-9) break;
        const dEnergy = Math.min(deficit[h], bess.kw, soc * bess.rte);
        if (dEnergy > 0) { soc -= dEnergy / bess.rte; deficit[h] -= dEnergy; shift += dEnergy; dchH[h] += dEnergy; }
      }
    }
  }
  faz = exc.reduce((a, b) => a + b, 0);
  cek = deficit.reduce((a, b) => a + b, 0);
  if (track) { track.prod = prod.slice(); track.cons = cons.slice(); track.mah = mahH; track.ch = chH; track.dch = dchH; track.faz = exc.slice(); track.cek = deficit.slice(); }
  return { mah, faz, cek, shift };
}

export interface MonthAgg { mah: number; faz: number; cek: number; shift: number; prod: number; cons: number; }
export interface YearSim { mah: number; faz: number; cek: number; shift: number; prod: number; monthly: MonthAgg[]; }

function simYear(p: CParams, yr: number): YearSim {
  const prodScale = Math.pow(1 - p.degr, yr - 1);
  const bess: Bess | null = p.bessOn ? { cap: p.bKwh * Math.pow(1 - p.bDegr, yr - 1), kw: p.bKw, rte: p.bRte } : null;
  const monthly: MonthAgg[] = [];
  let mah = 0, faz = 0, cek = 0, shift = 0, prod = 0;
  for (let m = 0; m < 12; m++) {
    const pd = dailyProd(p, m, prodScale);
    prod += pd.reduce((a, b) => a + b, 0) * DAYS[m];
    let mm = 0, mf = 0, mc = 0, ms = 0;
    const cdW = dayCons(p, m, 'wd'), cdE = dayCons(p, m, 'we');
    for (let d = 0; d < DAYS[m]; d++) {
      const f = DAYF[m][d];
      const pdd = pd.map((v) => v * f);
      const r = hourlyNet(pdd, d % 7 >= 5 ? cdE : cdW, bess);
      mm += r.mah; mf += r.faz; mc += r.cek; ms += r.shift;
    }
    mah += mm; faz += mf; cek += mc; shift += ms;
    monthly.push({ mah: mm, faz: mf, cek: mc, shift: ms, prod: pd.reduce((a, b) => a + b, 0) * DAYS[m], cons: monthCons(p, m) });
  }
  return { mah, faz, cek, shift, prod, monthly };
}

function simYearMonthlyRegime(p: CParams, yr: number): YearSim {
  const prodScale = Math.pow(1 - p.degr, yr - 1);
  let mah = 0, faz = 0, cek = 0, prod = 0;
  const monthly: MonthAgg[] = [];
  for (let m = 0; m < 12; m++) {
    const pd = dailyProd(p, m, prodScale);
    const pm = pd.reduce((a, b) => a + b, 0) * DAYS[m];
    const cm = monthCons(p, m);
    const mm = Math.min(pm, cm);
    mah += mm; faz += pm - mm; cek += cm - mm; prod += pm;
    monthly.push({ mah: mm, faz: pm - mm, cek: cm - mm, shift: 0, prod: pm, cons: cm });
  }
  return { mah, faz, cek, shift: 0, prod, monthly };
}

function applyLimit(p: CParams, s: YearSim): { bedelli: number; bedelsiz: number; limit: number } {
  if (p.abone === 'mesken') return { bedelli: s.faz, bedelsiz: 0, limit: Infinity };
  const limit = p.consPrev * 2;
  const bedelli = Math.min(s.faz, Math.max(0, limit - s.mah));
  return { bedelli, bedelsiz: s.faz - bedelli, limit };
}

function tlF(p: CParams, yr: number): number {
  let f = 1;
  for (let t = 2; t <= yr; t++) f *= 1 + (t <= 5 ? p.esc1 : p.esc2);
  return f;
}
function fxT(p: CParams, yr: number): number {
  let fx = p.fx0;
  for (let t = 2; t <= yr; t++) fx *= p.fxMode === 'man' ? 1 + p.fxMan : (1 + (t <= 5 ? p.esc1 : p.esc2)) / (1 + p.piUS);
  return fx;
}
function priceY(p: CParams, yr: number, base: number): number {
  return base * tlF(p, yr) * Math.pow(1 + p.preal, yr - 1);
}

export function irrOf(c0: number, cfs: number[]): number {
  const f = (r: number) => { let s = -c0; cfs.forEach((cf, i) => (s += cf / Math.pow(1 + r, i + 1))); return s; };
  let lo = -0.95, hi = 15;
  if (f(lo) * f(hi) > 0) return NaN;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; f(lo) * f(m) <= 0 ? (hi = m) : (lo = m); }
  return (lo + hi) / 2;
}
export function paybackOf(c0: number, cfs: number[]): number {
  let cum = -c0;
  for (let i = 0; i < cfs.length; i++) { const pv = cum; cum += cfs[i]; if (pv < 0 && cum >= 0) return i + (cfs[i] ? -pv / cfs[i] : 0); }
  return NaN;
}
function annuity(P: number, r: number, n: number): number {
  if (r === 0) return P / n;
  return (P * r) / (1 - Math.pow(1 + r, -n));
}

export interface CiYear {
  y: number;
  s: YearSim;
  L: { bedelli: number; bedelsiz: number; limit: number };
  buy: number; sell: number; fx: number; opexTL: number;
  sav: number; rev: number; cost: number; cfTL: number; cf: number;
}

export interface CiModel {
  regime: 'monthly' | 'hourly';
  capex: number;
  years: CiYear[];
  cfs: number[];
  npv: number; irr: number; pb: number; pbD: number;
  eIRR: number; ePB: number; loan: number; pay: number;
}

function fullModelP(p: CParams): CiModel {
  const regime: 'monthly' | 'hourly' = p.abone === 'mesken' ? 'monthly' : 'hourly';
  const capex = p.kwp * p.capexU + (p.bessOn ? p.bKwh * p.bCapex : 0);
  const years: CiYear[] = [];
  const cfs: number[] = [];
  for (let y = 1; y <= p.life; y++) {
    const s = regime === 'hourly' ? simYear(p, y) : simYearMonthlyRegime(p, y);
    const L = applyLimit(p, s);
    const buy = priceY(p, y, p.pBuy), sell = priceY(p, y, p.pSell), skb = p.skb * tlF(p, y);
    const fx = fxT(p, y);
    const opexTL = (p.kwp * p.opexU + (p.bessOn ? p.bKwh * p.bOpex : 0)) * tlF(p, y);
    const sav = (s.mah + s.shift) * buy;
    const rev = L.bedelli * sell;
    const cost = L.bedelsiz * skb;
    const cfTL = sav + rev - cost - opexTL;
    const cf = cfTL / fx;
    years.push({ y, s, L, buy, sell, fx, opexTL, sav, rev, cost, cfTL, cf });
    cfs.push(cf);
  }
  const npv = cfs.reduce((a, cf, i) => a + cf / Math.pow(1 + p.r, i + 1), 0) - capex;
  const irr = irrOf(capex, cfs);
  const pb = paybackOf(capex, cfs);
  const pbD = paybackOf(capex, cfs.map((cf, i) => cf / Math.pow(1 + p.r, i + 1)));
  let eIRR = NaN, ePB = NaN, loan = 0, pay = 0;
  if (p.lOn) {
    loan = capex * p.lRatio; pay = annuity(loan, p.lRate, p.lTerm);
    const eq = capex - loan;
    const ecfs = cfs.map((cf, i) => cf - (i < p.lTerm ? pay : 0));
    eIRR = irrOf(eq, ecfs); ePB = paybackOf(eq, ecfs);
  }
  return { regime, capex, years, cfs, npv, irr, pb, pbD, eIRR, ePB, loan, pay };
}

// ============================ NORMALIZE + PUBLIC API ============================
export function normalizeCi(i: CiInputs): CParams {
  // Savunmacı kelepçeler: boş/uç girdiler (ör. RTE=0 → sıfıra bölme) motoru
  // NaN'a düşürmesin. Değerler makul bantlara sıkıştırılır.
  const cl = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, Number.isFinite(x) ? x : lo));
  return {
    pname: i.pname || 'C&I GES Projesi', prep: i.prep,
    abone: i.abone, consY: cl(i.consY, 1, 1e12), consPrev: cl(i.consPrev, 1, 1e12),
    mPct: i.monthly, weRatio: cl(i.weRatio, 0, 300) / 100, wd: i.wd, we: i.we,
    kwp: cl(i.kwp, 0, 1e9), spec: cl(i.spec, 0, 5000), orient: i.orient, degr: cl(i.degr, 0, 10) / 100, life: cl(Math.round(i.life), 5, 40),
    skb: cl(i.skb, 0, 1e6),
    pBuy: cl(i.pBuy, 0, 1e6), pSell: cl(i.pSell, 0, 1e6), esc1: cl(i.esc1, -50, 500) / 100, esc2: cl(i.esc2, -50, 500) / 100, preal: cl(i.preal, -50, 50) / 100,
    fx0: cl(i.fx0, 0.01, 1e6), piUS: cl(i.piUS, 0, 50) / 100, fxMode: i.fxMode, fxMan: cl(i.fxMan, -50, 500) / 100,
    bessOn: i.bessOn, bKwh: cl(i.bKwh, 0, 1e9), bKw: cl(i.bKw, 0, 1e9), bRte: cl(i.bRte, 30, 100) / 100, bDegr: cl(i.bDegr, 0, 20) / 100, bCapex: cl(i.bCapex, 0, 1e6), bOpex: cl(i.bOpex, 0, 1e6),
    capexU: cl(i.capexU, 0, 1e6), opexU: cl(i.opexU, 0, 1e6), r: cl(i.r, 0.01, 100) / 100,
    lOn: i.lOn, lRatio: cl(i.lRatio, 0, 100) / 100, lRate: cl(i.lRate, 0, 200) / 100, lTerm: cl(Math.round(i.lTerm), 1, 40),
  };
}

export function computeCi(inputs: CiInputs): CiModel {
  return fullModelP(normalizeCi(inputs));
}

/** Yıl-1 saatlik gün detayı (grafik/tablo/CSV için). */
export function ciDayDetail(inputs: CiInputs, mi: number, dt: 'wd' | 'we', pf = 1): DayTrack {
  const p = normalizeCi(inputs);
  const pd = dailyProd(p, mi, 1).map((v) => v * pf);
  const cd = dayCons(p, mi, dt);
  const bess: Bess | null = p.bessOn ? { cap: p.bKwh, kw: p.bKw, rte: p.bRte } : null;
  const t: DayTrack = { prod: [], cons: [], mah: [], ch: [], dch: [], faz: [], cek: [] };
  hourlyNet(pd, cd, bess, t);
  return t;
}
export function ciMonthCons(inputs: CiInputs, mi: number): number {
  return monthCons(normalizeCi(inputs), mi);
}
export function ciCalDays(mi: number): { wd: number; we: number } {
  return calDays(mi);
}
/** Ay içi üretim eğim faktörü (gün gün; ay ortalaması 1). Net grafiğin gün görünümü için. */
export function ciDayFactor(mi: number, d: number): number {
  return DAYF[mi][d] ?? 1;
}
/** Bir günün 24 saatlik tüketim dağılımı (kWh) — grafik için. */
export function ciDayCons(inputs: CiInputs, mi: number, dt: 'wd' | 'we'): number[] {
  return dayCons(normalizeCi(inputs), mi, dt);
}
/** Yıl-1 saatlik rejim aylık toplamları (grafik/tablolar için). */
export function ciYear1Monthly(inputs: CiInputs): MonthAgg[] {
  return simYear(normalizeCi(inputs), 1).monthly;
}

/** Yıl-1 saatlik vs aylık rejim karşılaştırması. */
export function ciCompareYear1(inputs: CiInputs) {
  const p = normalizeCi(inputs);
  const h = simYear(p, 1);
  const mo = simYearMonthlyRegime(p, 1);
  const Lh = applyLimit(p, h), Lm = applyLimit(p, mo);
  const benH = ((h.mah + h.shift) * p.pBuy + Lh.bedelli * p.pSell) / p.fx0;
  const benM = (mo.mah * p.pBuy + Lm.bedelli * p.pSell) / p.fx0;
  return { h, mo, Lh, Lm, benH, benM };
}

export function ciSummary(inputs: CiInputs, m: CiModel): import('../types').ProjectSummary {
  const y1 = m.years[0];
  const selfC = y1.s.prod > 0 ? (y1.s.mah + y1.s.shift) / y1.s.prod : 0;
  return {
    kind: 'ci',
    capexUsd: m.capex,
    npvUsd: m.npv,
    irrPct: m.irr,
    paybackYears: m.pb,
    selfConsumption: selfC,
    capacityLabel: inputs.bessOn
      ? `${inputs.kwp.toLocaleString('tr-TR')} kWp + ${inputs.bKwh.toLocaleString('tr-TR')} kWh`
      : `${inputs.kwp.toLocaleString('tr-TR')} kWp`,
  };
}
