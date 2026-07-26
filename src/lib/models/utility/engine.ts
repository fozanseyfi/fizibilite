// Utility (GES + BESS Proje Finansmanı) modeli — hesap motoru.
// Kaynak: "GES + BESS Proje Finansmanı Fizibilite Modeli" HTML'inin JS motoru.
// Matematik birebir korunmuştur; yalnızca TypeScript tipleri eklenmiştir.

// ============================ INPUTS ============================
// Alanlar HTML formundaki girdilerle aynı semantiğe sahiptir:
// yüzdeler "insan" değeri olarak tutulur (ör. debt=70 → %70), motor içeride /100 yapar.

export interface HuaweiInputs {
  count: number;   // inverter adedi
  diff: number;    // adet başına fiyat farkı ($)
  prodPct: number; // üretim avantajı (%/yıl)
  opexPct: number; // OPEX tasarrufu (%)
}

export interface UtilityInputs {
  pname: string;
  prep: string;

  mw: number;          // kurulu güç (MWp DC)
  capexUnit: number;   // EPC CAPEX ($/kWp)

  cur: 'tl' | 'usd';
  pmode: 'single' | 'two';
  ppaY: number;
  ppaCur: 'usd' | 'tl';
  ppaUSD: number;
  ppaEsc: number;
  ppaTL: number;

  fx0: number;
  piTLa: number;   // TL enflasyonu ilk 5 yıl (%)
  piTLb: number;   // TL enflasyonu sonrası (%)
  piUS: number;    // USD enflasyonu (%)
  fxMode: 'ppp' | 'man';
  fxMan: number;

  priceTL: number;
  priceReal: number;
  opexShare: number;   // OPEX'in TL payı (%)
  bPcTL: number;       // BESS şarj fiyatı (TL/MWh)
  bPdTL: number;       // BESS deşarj fiyatı (TL/MWh)

  spec: number;    // spesifik üretim P50 (kWh/kWp)
  dcac: number;
  p90: number;     // P90/P50 (%)
  scen: 'p50' | 'p90';
  avail: number;   // (%)
  curt: number;    // kısıntı (%)
  degr: number;    // degradasyon (%/yıl)
  life: number;

  price: number;      // USD modu satış fiyatı ($/MWh)
  priceEsc: number;   // (%)
  opexUnit: number;   // ($/MWp/yıl)
  opexEsc: number;    // (%)
  replYear: number;
  replCost: number;   // ($/kWp)
  salvage: number;

  bessOn: boolean;
  bMW: number;
  bMWh: number;
  bCapexU: number;   // ($/kWh)
  bOpexU: number;    // ($/kWh/yıl)
  bRTE: number;      // (%)
  bCyc: number;
  bDegr: number;     // (%/yıl)
  bAvail: number;    // (%)
  bPc: number;       // USD şarj ($/MWh)
  bPd: number;       // USD deşarj ($/MWh)
  bAugY: number;
  bAugC: number;     // ($/kWh)

  tax: number;       // kurumlar vergisi (%)
  holiday: number;   // vergi tatili (yıl)
  depY: number;      // amortisman süresi (yıl)
  vat: number;       // KDV (%)
  vatM: number;      // KDV iade süresi (ay)

  consM: number;     // inşaat süresi (ay)
  order: 'eq' | 'pro';

  debt: number;      // gearing (%)
  kd: number;        // kredi faizi (%)
  ke: number;        // özkaynak beklentisi (%)
  tenor: number;
  grace: number;
  style: 'sculpt' | 'ann' | 'eqp';
  target: number;    // hedef DSCR
  dsraM: number;     // DSRA (ay)
  fee: number;       // düzenleme ücreti (%)
  useWacc: boolean;
  rManual: number;   // manuel iskonto (%)

  huawei: HuaweiInputs;
}

// ============================ INTERNAL PARAMS ============================

interface UParams {
  pname: string; prep: string;
  mw: number; capexUnit: number; pvCapex: number; invCapex: number;
  cur: 'tl' | 'usd'; pmode: 'single' | 'two'; ppaY: number; ppaCur: 'usd' | 'tl';
  ppaUSD: number; ppaEsc: number; ppaTL: number;
  fx0: number; piTLa: number; piTLb: number; piUS: number;
  fxMode: 'ppp' | 'man'; fxMan: number;
  priceTL: number; priceReal: number; opexShare: number;
  bPcTL: number; bPdTL: number;
  spec: number; dcac: number; p90r: number; scen: 'p50' | 'p90';
  avail: number; curt: number; degr: number; life: number;
  price: number; priceEsc: number;
  opexUnit: number; opexEsc: number;
  replYear: number; replCost: number; salvage: number;
  bessOn: boolean; bMW: number; bMWh: number; bCapexU: number; bOpexU: number;
  bRTE: number; bCyc: number; bDegr: number; bAvail: number;
  bPc: number; bPd: number; bAugY: number; bAugC: number;
  tax: number; holiday: number; depY: number;
  vat: number; vatM: number;
  consM: number; order: 'eq' | 'pro';
  debtR: number; kd: number; ke: number; wacc: number; tenor: number;
  grace: number; style: 'sculpt' | 'ann' | 'eqp';
  target: number; dsraM: number; feePct: number;
  r: number; useW: boolean;
}

export interface UtilityOpts {
  prodMult?: number;
  opexMult?: number;
  priceMult?: number;
  dCapex?: number;
}

export interface UtilityYear {
  t: number;
  E: number; disch: number;
  revPV: number; revB: number;
  opexPV: number; opexB: number;
  ebitda: number; dept: number; capexM: number;
  taxU: number; fcf: number;
  interest: number; principal: number; ds: number;
  taxL: number; cfads: number; dscr: number; eqcf: number;
  balEnd: number; fx: number | null; chc: number; priceT: number;
}

export interface UtilityModel {
  baseCost: number; bessCapex: number; debt: number; equity: number;
  fee: number; idc: number; dsra: number; vatC: number; totalUses: number; depBasis: number;
  yrs: UtilityYear[]; residual: number; E1: number; fcfs: number[];
  npv: number; irr: number; pbS: number; pbD: number;
  lcoe: number; lcos: number; minDSCR: number; avgDSCR: number;
  llcr: number; plcr: number; eIRR: number; moic: number; pvE: number; r: number;
}

export interface HuaweiResult {
  count: number; diff: number; prodPct: number; opexPct: number;
  dCapex: number; dNPV: number; dIRR: number; dPB: number;
  annual1: number; extraMWh1: number; opexSave1: number;
  dFCFs: number[]; hwModel: UtilityModel;
}

// ============================ FINANCE PRIMITIVES ============================

function annuity(P: number, r: number, n: number): number {
  if (n <= 0) return 0;
  if (r === 0) return P / n;
  return (P * r) / (1 - Math.pow(1 + r, -n));
}
function npvOf(c0: number, cfs: number[], r: number): number {
  let s = -c0;
  cfs.forEach((cf, i) => (s += cf / Math.pow(1 + r, i + 1)));
  return s;
}
export function irrOf(c0: number, cfs: number[]): number {
  const f = (r: number) => npvOf(c0, cfs, r);
  let lo = -0.95, hi = 10;
  if (!isFinite(f(lo)) || f(lo) * f(hi) > 0) return NaN;
  for (let i = 0; i < 250; i++) {
    const m = (lo + hi) / 2;
    f(lo) * f(m) <= 0 ? (hi = m) : (lo = m);
  }
  return (lo + hi) / 2;
}
export function paybackOf(c0: number, cfs: number[]): number {
  if (c0 <= 0) return 0;
  let cum = -c0;
  for (let i = 0; i < cfs.length; i++) {
    const prev = cum;
    cum += cfs[i];
    if (prev < 0 && cum >= 0) return i + (cfs[i] !== 0 ? -prev / cfs[i] : 0);
  }
  return NaN;
}

/** IDC: linear monthly spend of 'spend' over m months; debt drawn per order */
function calcIDC(spend: number, debt: number, p: UParams): number {
  const m = p.consM, ms = spend / m;
  let idc = 0;
  if (p.order === 'pro') {
    const share = Math.min(1, spend > 0 ? debt / spend : 0);
    for (let i = 1; i <= m; i++) idc += (share * ms * (i - 0.5) * p.kd) / 12;
  } else {
    const eqAmt = Math.max(0, spend - debt);
    for (let i = 1; i <= m; i++) {
      const cumSpend = ms * i, prevSpend = ms * (i - 1);
      const drawnEnd = Math.max(0, cumSpend - eqAmt), drawnStart = Math.max(0, prevSpend - eqAmt);
      idc += ((drawnStart + drawnEnd) / 2) * (p.kd / 12);
    }
  }
  return idc;
}

// ===== Operating + debt schedule for a given debt & depBasis =====
function buildSchedule(p: UParams, o: UtilityOpts, depBasis: number, debt: number) {
  const prodMult = o.prodMult ?? 1, opexMult = o.opexMult ?? 1, priceMult = o.priceMult ?? 1;
  const scenR = p.scen === 'p90' ? p.p90r : 1;
  const E1 = (p.mw * 1000 * p.spec * scenR * p.avail * (1 - p.curt)) / 1000 * prodMult;
  const dep = depBasis / p.depY;
  const bess = p.bessOn;
  const tl = p.cur === 'tl';
  const nRep = p.tenor - p.grace;
  const payAnn = p.style === 'ann' ? annuity(debt, p.kd, nRep) : 0;
  let bal = debt, residual = 0;
  let fx = p.fx0, tlF = 1, usF = 1, prF = 1;
  const yrs: UtilityYear[] = [];
  for (let t = 1; t <= p.life; t++) {
    if (tl && t > 1) {
      const pi = t <= 5 ? p.piTLa : p.piTLb;
      tlF *= 1 + pi; usF *= 1 + p.piUS; prF *= (1 + pi) * (1 + p.priceReal);
      const depr = p.fxMode === 'ppp' ? (1 + pi) / (1 + p.piUS) - 1 : p.fxMan;
      fx *= 1 + depr;
    }
    const E = E1 * Math.pow(1 - p.degr, t - 1);
    let priceT: number;
    if (p.pmode === 'two' && t <= p.ppaY) {
      priceT = p.ppaCur === 'usd'
        ? p.ppaUSD * Math.pow(1 + p.ppaEsc, t - 1) * priceMult
        : (p.ppaTL * tlF) / fx * priceMult;
    } else {
      priceT = tl ? (p.priceTL * prF) / fx * priceMult : p.price * priceMult * Math.pow(1 + p.priceEsc, t - 1);
    }
    const revPV = E * priceT;
    const disch = bess ? p.bMWh * p.bCyc * 365 * p.bAvail * Math.pow(1 - p.bDegr, t - 1) : 0;
    const pcU = bess ? (tl ? (p.bPcTL * tlF) / fx : p.bPc) : 0;
    const pdU = bess ? (tl ? (p.bPdTL * tlF) / fx : p.bPd) : 0;
    const revB = disch * (bess ? pdU - pcU / Math.max(p.bRTE, 0.01) : 0);
    const chc = bess ? (disch * pcU) / Math.max(p.bRTE, 0.01) : 0;
    const opexPV = tl
      ? p.mw * p.opexUnit * opexMult * (p.opexShare * tlF * p.fx0 / fx + (1 - p.opexShare) * usF)
      : p.mw * p.opexUnit * opexMult * Math.pow(1 + p.opexEsc, t - 1);
    const opexB = bess ? p.bMWh * 1000 * p.bOpexU * (tl ? usF : Math.pow(1 + p.opexEsc, t - 1)) : 0;
    const ebitda = revPV + revB - opexPV - opexB;
    const dept = t <= p.depY ? dep : 0;
    let capexM = 0;
    if (t === p.replYear && p.replYear > 0) capexM += p.mw * 1000 * p.replCost;
    if (bess && t === p.bAugY && p.bAugY > 0) capexM += p.bMWh * 1000 * p.bAugC;
    const rate = t <= p.holiday ? 0 : p.tax;
    const taxU = rate * Math.max(0, ebitda - dept);
    let fcf = ebitda - taxU - capexM;
    let interest = 0, principal = 0, ds = 0;
    if (bal > 1e-6 && t <= p.tenor) {
      interest = bal * p.kd;
      const taxLpre = rate * Math.max(0, ebitda - dept - interest);
      const cfadsPre = ebitda - taxLpre - capexM;
      if (t <= p.grace) { principal = 0; }
      else if (p.style === 'ann') { principal = Math.min(bal, payAnn - interest); }
      else if (p.style === 'eqp') { principal = Math.min(bal, debt / nRep); }
      else { principal = Math.max(0, Math.min(bal, cfadsPre / p.target - interest)); }
      if (t === p.tenor && p.style !== 'sculpt') principal = bal;
      ds = interest + principal; bal -= principal;
    }
    const taxL = rate * Math.max(0, ebitda - dept - interest);
    const cfads = ebitda - taxL - capexM;
    const dscr = ds > 1e-6 ? cfads / ds : NaN;
    let eqcf = cfads - ds;
    if (t === p.life) { fcf += p.salvage; eqcf += p.salvage; }
    yrs.push({ t, E, disch, revPV, revB, opexPV, opexB, ebitda, dept, capexM, taxU, fcf, interest, principal, ds, taxL, cfads, dscr, eqcf, balEnd: bal, fx: tl ? fx : null, chc, priceT });
  }
  if (bal > 1) residual = bal;
  const firstDS = yrs.find((y) => y.ds > 1e-6);
  return { yrs, residual, ds1: firstDS ? firstDS.ds : 0, E1 };
}

// ===== Full model with circular financing solve =====
function fullModelP(p: UParams, o: UtilityOpts = {}): UtilityModel {
  const bessCapex = p.bessOn ? p.bMWh * 1000 * p.bCapexU : 0;
  const baseCost = p.pvCapex + bessCapex + (o.dCapex ?? 0);
  let debt = p.debtR * baseCost, fee = 0, idc = 0, dsra = 0, vatC = 0, totalUses = baseCost;
  let sched = buildSchedule(p, o, baseCost, debt);
  let depBasis = baseCost;
  for (let it = 0; it < 40; it++) {
    fee = p.feePct * debt;
    idc = calcIDC(baseCost + fee, debt, p);
    vatC = p.vat * baseCost * p.kd * (p.vatM / 12);
    depBasis = baseCost + fee + idc;
    sched = buildSchedule(p, o, depBasis, debt);
    dsra = (p.dsraM / 12) * sched.ds1;
    totalUses = baseCost + fee + idc + dsra + vatC;
    const nd = p.debtR * totalUses;
    if (Math.abs(nd - debt) < 1) break;
    debt = nd;
  }
  const equity = totalUses - debt;
  const eqcfs = sched.yrs.map((y) => y.eqcf);
  if (p.tenor <= p.life) eqcfs[p.tenor - 1] += dsra; else eqcfs[eqcfs.length - 1] += dsra;
  const r = p.r;
  const fcfs = sched.yrs.map((y) => y.fcf);
  const pv = (arr: number[]) => arr.reduce((s, v, i) => s + v / Math.pow(1 + r, i + 1), 0);
  const npv = pv(fcfs) - baseCost;
  const irr = irrOf(baseCost, fcfs);
  const pbS = paybackOf(baseCost, fcfs);
  const pbD = paybackOf(baseCost, fcfs.map((cf, i) => cf / Math.pow(1 + r, i + 1)));
  // LCOE = yalnız PV üretiminin maliyeti: pay = PV EPC CAPEX + PV OPEX + PV bakım
  // (inverter yenileme); payda = yalnız PV üretimi. BESS tamamen LCOS'ta ayrı tutulur
  // (aksi halde şebeke-arbitrajı deşarjı paydayı şişirip LCOE'yi suni düşürür).
  const pvCapexLcoe = p.pvCapex + (o.dCapex ?? 0);
  const pvCost = pv(sched.yrs.map((y) => y.opexPV + (y.t === p.replYear && p.replYear > 0 ? p.mw * 1000 * p.replCost : 0)));
  const pvE = pv(sched.yrs.map((y) => y.E));
  const lcoe = pvE > 0 ? (pvCapexLcoe + pvCost) / pvE : NaN;
  let lcos = NaN;
  if (p.bessOn) {
    const pvD = pv(sched.yrs.map((y) => y.disch));
    const pvBc = pv(sched.yrs.map((y) => y.opexB + (y.t === p.bAugY && p.bAugY > 0 ? p.bMWh * 1000 * p.bAugC : 0) + y.chc));
    lcos = pvD > 0 ? (bessCapex + pvBc) / pvD : NaN;
  }
  const dscrs = sched.yrs.filter((y) => isFinite(y.dscr) && y.t > p.grace).map((y) => y.dscr);
  const minDSCR = dscrs.length ? Math.min(...dscrs) : NaN;
  const avgDSCR = dscrs.length ? dscrs.reduce((a, b) => a + b, 0) / dscrs.length : NaN;
  const pvKd = (arr: number[], upto: number) => arr.slice(0, upto).reduce((s, v, i) => s + v / Math.pow(1 + p.kd, i + 1), 0);
  const cfadsArr = sched.yrs.map((y) => y.cfads);
  const llcr = debt > 0 ? pvKd(cfadsArr, Math.min(p.tenor, p.life)) / debt : NaN;
  const plcr = debt > 0 ? pvKd(cfadsArr, p.life) / debt : NaN;
  const eIRR = equity > 0 ? irrOf(equity, eqcfs) : NaN;
  const moic = equity > 0 ? eqcfs.reduce((a, b) => a + b, 0) / equity : NaN;
  return {
    baseCost, bessCapex, debt, equity, fee, idc, dsra, vatC, totalUses, depBasis,
    yrs: sched.yrs, residual: sched.residual, E1: sched.E1, fcfs,
    npv, irr, pbS, pbD, lcoe, lcos, minDSCR, avgDSCR, llcr, plcr, eIRR, moic, pvE, r,
  };
}

// ============================ NORMALIZE + PUBLIC API ============================

export function normalizeUtility(i: UtilityInputs): UParams {
  const mw = i.mw;
  const capexUnit = i.capexUnit;
  const debtR = Math.min(i.debt, 90) / 100;
  const kd = i.kd / 100, ke = i.ke / 100;
  // Vergi-sonrası WACC: faiz gideri vergiden düşülebildiği için borcun efektif
  // maliyeti kd×(1−vergi). Kaldıraçsız-vergi-sonrası FCF'ler bu oranla iskonto edilir.
  const wacc = debtR * kd * (1 - i.tax / 100) + (1 - debtR) * ke;
  const useW = i.useWacc;
  const cur = i.cur;
  const ppaCur = cur === 'tl' ? i.ppaCur : 'usd';
  return {
    pname: i.pname || 'GES Projesi', prep: i.prep,
    mw, capexUnit, pvCapex: mw * 1000 * capexUnit, invCapex: 0,
    cur, pmode: i.pmode, ppaY: Math.max(1, Math.round(i.ppaY)), ppaCur,
    ppaUSD: i.ppaUSD, ppaEsc: i.ppaEsc / 100, ppaTL: i.ppaTL,
    fx0: i.fx0, piTLa: i.piTLa / 100, piTLb: i.piTLb / 100, piUS: i.piUS / 100,
    fxMode: i.fxMode, fxMan: i.fxMan / 100,
    priceTL: i.priceTL, priceReal: i.priceReal / 100, opexShare: Math.min(i.opexShare, 100) / 100,
    bPcTL: i.bPcTL, bPdTL: i.bPdTL,
    spec: i.spec, dcac: i.dcac, p90r: Math.min(i.p90, 100) / 100, scen: i.scen,
    avail: Math.min(i.avail, 100) / 100, curt: i.curt / 100, degr: i.degr / 100,
    life: Math.max(5, Math.round(i.life)),
    price: i.price, priceEsc: i.priceEsc / 100,
    opexUnit: i.opexUnit, opexEsc: i.opexEsc / 100,
    replYear: Math.round(i.replYear), replCost: i.replCost, salvage: i.salvage,
    bessOn: i.bessOn, bMW: i.bMW, bMWh: i.bMWh, bCapexU: i.bCapexU, bOpexU: i.bOpexU,
    bRTE: i.bRTE / 100, bCyc: i.bCyc, bDegr: i.bDegr / 100, bAvail: i.bAvail / 100,
    bPc: i.bPc, bPd: i.bPd, bAugY: Math.round(i.bAugY), bAugC: i.bAugC,
    tax: i.tax / 100, holiday: Math.round(i.holiday), depY: Math.max(1, Math.round(i.depY)),
    vat: i.vat / 100, vatM: i.vatM,
    consM: Math.max(1, Math.round(i.consM)), order: i.order,
    debtR, kd, ke, wacc, tenor: Math.max(1, Math.round(i.tenor)),
    grace: Math.max(0, Math.round(i.grace)), style: i.style,
    target: Math.max(1, i.target), dsraM: i.dsraM, feePct: i.fee / 100,
    r: useW ? wacc : i.rManual / 100, useW,
  };
}

/** Ana hesap — HTML'deki fullModel(p,o) ile birebir. */
export function computeUtility(inputs: UtilityInputs, opts: UtilityOpts = {}): UtilityModel {
  return fullModelP(normalizeUtility(inputs), opts);
}

/** Huawei artımlı değer analizi (Tab 2). */
export function computeUtilityHuawei(inputs: UtilityInputs, base: UtilityModel): HuaweiResult {
  const p = normalizeUtility(inputs);
  const h = inputs.huawei;
  const count = Math.max(1, Math.round(h.count));
  const diff = h.diff;
  const prodPct = h.prodPct;
  const opexPct = h.opexPct;
  const dCapex = count * diff;
  const hw = fullModelP(p, { prodMult: 1 + prodPct / 100, opexMult: 1 - opexPct / 100, dCapex });
  const dFCFs = hw.yrs.map((y, i) => y.fcf - base.yrs[i].fcf);
  const r = p.r;
  const dNPV = npvOf(dCapex, dFCFs, r);
  const dIRR = irrOf(dCapex, dFCFs);
  const dPB = paybackOf(dCapex, dFCFs);
  const annual1 = hw.yrs[0].ebitda - base.yrs[0].ebitda;
  const extraMWh1 = hw.yrs[0].E - base.yrs[0].E;
  const opexSave1 = base.yrs[0].opexPV - hw.yrs[0].opexPV;
  return { count, diff, prodPct, opexPct, dCapex, dNPV, dIRR, dPB, annual1, extraMWh1, opexSave1, dFCFs, hwModel: hw };
}

export function utilitySummary(inputs: UtilityInputs, m: UtilityModel): import('../types').ProjectSummary {
  return {
    kind: 'utility',
    capexUsd: m.totalUses,
    npvUsd: m.npv,
    irrPct: m.irr,
    paybackYears: m.pbS,
    lcoe: m.lcoe,
    minDscr: m.minDSCR,
    capacityLabel: inputs.bessOn
      ? `${inputs.mw} MWp + ${inputs.bMWh} MWh`
      : `${inputs.mw} MWp`,
  };
}
