// C&I / Mesken — mevcut GES'e sonradan batarya ekleme fizibilitesi.
//
// Mevzuat çerçevesi (1 Ocak 2026 depolama yönetmeliği değişikliği):
//  - Tüketim tesisine / lisanssız üretim tesisine bütünleşik depolama yalnızca
//    tesisin kendi ihtiyacı için kurulur; depodan şebekeye verilen enerjiye ödeme yapılmaz.
//  - Bu yüzden batarya burada gelir üretmez, FATURAYI düşürür. Model, aynı yıl için
//    "bataryasız" ve "bataryalı" faturayı saatlik simülasyonla hesaplayıp farkı alır.
//
// Kullanım senaryoları:
//  self   — güneş fazlasını akşama kaydırma (öz tüketim)
//  arb    — üç zamanlı tarifede gece şebekeden şarj, puantta deşarj
//  peak   — çift terimli tarifede güç bedelini (aylık zirve çekiş) düşürme
//  backup — kesintide kritik yükü besleme

import { DAYS, MONTHS, shapesForProfile, monthlyForSeason, WE_RATIO, type ProfileKey, type SeasonKey } from '@/lib/models/ci/presets';
import { calDays, clamp, emptyTrace, irrOf, npvOf, paybackOf, pvDay, pvSum, sohCheck, sohReqsOf, zoneOf, type DayTrace, type SohCheck, type SohReq } from './common';

export interface BessCiInputs {
  pname: string; firm?: string; loc?: string; prep: string;
  abone: 'ci' | 'mesken';
  // Mevcut GES + tüketim
  kwp: number; spec: number; orient: 's' | 'ew'; pvDegr: number;
  consY: number; profileId: string; season: string;
  // Kullanım senaryoları
  useSelf: boolean; useArb: boolean; usePeak: boolean; useBackup: boolean;
  // Tarife (TL/kWh, vergiler dahil son kullanıcı birim fiyatı)
  tariff: 'tek' | 'uc';
  pTek: number; pGunduz: number; pPuant: number; pGece: number;
  pSell: number;
  // Güç bedeli (zirve tıraşlama)
  demandFee: number; peakCutKw: number; peakHours: number;
  // Yedekleme
  outageH: number; outageCost: number; criticalKw: number; eventH: number; backupReserve: number;
  // Batarya
  bKwh: number; bKw: number; rte: number; dod: number; bDegr: number; life: number;
  capexKwh: number; opexPct: number; augYear: number; augCost: number;
  /** C-oranı (güç = kapasite × C). 0 → güç elle girilir */
  cRate: number;
  /** Güç dönüştürücü (PCS/inverter) maliyeti — C-oranının ekonomik etkisi buradan gelir */
  capexKw: number;
  /** Kapasite sağlığı şartı: sohY1. yıl sonunda en az %sohP1 (ikinci kontrol noktası da aynı) */
  sohY1: number; sohP1: number; sohY2: number; sohP2: number;
  // Finans
  fx0: number; tlEsc: number; fxEsc: number; disc: number;
}

export interface BessCiYear {
  y: number;
  capKwh: number;
  energyTL: number; peakTL: number; backupTL: number;
  savingUsd: number; opexUsd: number; augUsd: number; cfUsd: number; cumUsd: number;
  disKwh: number;
}

export interface BessCiBreak { self: number; arb: number; peak: number; backup: number }

export interface BessCiModel {
  capex: number;
  /** Etkin güç (kW) — C-oranından türetilir */
  bKw: number;
  soh: SohCheck;
  years: BessCiYear[];
  npv: number; irr: number; payback: number; lcos: number;
  /** 1. yıl, bugünkü fiyatlarla TL kazanç kırılımı */
  y1: BessCiBreak;
  y1Stats: { disKwh: number; chSolar: number; chGrid: number; cycles: number; baseBillTL: number; bessBillTL: number; peakCutKw: number; backupCoverage: number };
  summer: DayTrace; winter: DayTrace;
  warnings: string[];
}

interface P {
  abone: 'ci' | 'mesken';
  kwp: number; spec: number; orient: 's' | 'ew'; pvDegr: number;
  consY: number; wd: number[]; we: number[]; weRatio: number; mPct: number[];
  useSelf: boolean; useArb: boolean; usePeak: boolean; useBackup: boolean;
  tariff: 'tek' | 'uc'; price: number[]; pSell: number;
  demandFee: number; peakCutKw: number; peakHours: number;
  outageH: number; outageCost: number; criticalKw: number; eventH: number; backupReserve: number;
  bKwh: number; bKw: number; rte: number; dod: number; bDegr: number; life: number;
  capexKwh: number; opexPct: number; augYear: number; augCost: number;
  capexKw: number; sohReqs: SohReq[];
  fx0: number; tlEsc: number; fxEsc: number; disc: number;
}

export function normalizeBessCi(i: BessCiInputs): P {
  const key = (i.profileId in WE_RATIO ? i.profileId : 'tekvardiya') as ProfileKey;
  const shapes = shapesForProfile(key);
  const tariff = i.tariff === 'uc' ? 'uc' : 'tek';
  const zonePrice = { gece: i.pGece, gunduz: i.pGunduz, puant: i.pPuant };
  const price = Array.from({ length: 24 }, (_, h) => (tariff === 'uc' ? zonePrice[zoneOf(h)] : i.pTek));
  return {
    abone: i.abone === 'mesken' ? 'mesken' : 'ci',
    kwp: clamp(i.kwp, 0, 1e7), spec: clamp(i.spec, 500, 2500), orient: i.orient === 'ew' ? 'ew' : 's', pvDegr: clamp(i.pvDegr, 0, 5) / 100,
    consY: clamp(i.consY, 0, 1e10), wd: shapes.wd, we: shapes.we, weRatio: WE_RATIO[key] / 100,
    mPct: monthlyForSeason((['flat', 'yaz', 'kis'].includes(i.season) ? i.season : 'flat') as SeasonKey),
    useSelf: !!i.useSelf, useArb: !!i.useArb && tariff === 'uc', usePeak: !!i.usePeak && i.abone !== 'mesken', useBackup: !!i.useBackup,
    tariff, price: price.map((v) => clamp(v, 0, 1e3)), pSell: clamp(i.pSell, 0, 1e3),
    demandFee: clamp(i.demandFee, 0, 1e6), peakCutKw: clamp(i.peakCutKw, 0, 1e7), peakHours: clamp(i.peakHours, 0.25, 24),
    outageH: clamp(i.outageH, 0, 8760), outageCost: clamp(i.outageCost, 0, 1e9), criticalKw: clamp(i.criticalKw, 0.1, 1e7),
    eventH: clamp(i.eventH, 0.1, 72), backupReserve: clamp(i.backupReserve, 0, 100) / 100,
    bKwh: clamp(i.bKwh, 0, 1e8), bKw: (i.cRate ?? 0) > 0 ? clamp(i.bKwh, 0, 1e8) * clamp(i.cRate, 0.05, 4) : clamp(i.bKw, 0, 1e8), rte: clamp(i.rte, 50, 100) / 100, dod: clamp(i.dod, 50, 100) / 100,
    bDegr: clamp(i.bDegr, 0, 10) / 100, life: Math.round(clamp(i.life, 3, 30)),
    capexKwh: clamp(i.capexKwh, 0, 1e5), capexKw: clamp(i.capexKw ?? 0, 0, 1e5), sohReqs: sohReqsOf(i), opexPct: clamp(i.opexPct, 0, 20) / 100, augYear: Math.round(clamp(i.augYear, 0, 30)), augCost: clamp(i.augCost, 0, 1e5),
    fx0: clamp(i.fx0, 1, 1e5), tlEsc: clamp(i.tlEsc, -50, 300) / 100, fxEsc: clamp(i.fxEsc, -50, 300) / 100, disc: clamp(i.disc, 0, 60) / 100,
  };
}

function dayCons(p: P, mi: number, dt: 'wd' | 'we'): number[] {
  const { wd, we } = calDays(mi);
  const month = (p.consY * p.mPct[mi]) / 100;
  const dWd = month / (wd + we * p.weRatio);
  const day = dt === 'wd' ? dWd : dWd * p.weRatio;
  return (dt === 'wd' ? p.wd : p.we).map((s) => (day * s) / 100);
}

interface Flags { self: boolean; arb: boolean }
interface DayOut { imp: number[]; exp: number[]; dis: number; chSolar: number; chGrid: number; trace?: DayTrace }

/**
 * Bir temsili günün saatlik dağıtımı. Gün 00:00'da boş batarya ile başlar (muhafazakâr).
 * Sıra: gece (00–06) planlı şebeke şarjı → gündüz güneş fazlasıyla şarj → açık saatlerde deşarj.
 * Üç zamanlı tarifede deşarj puanta öncelik verir (gündüz deşarjı yalnızca puant ihtiyacı karşılandıktan sonra).
 */
function dispatchDay(p: P, prod: number[], cons: number[], cap: number, f: Flags, track: boolean): DayOut {
  const def = cons.map((c, h) => Math.max(0, c - prod[h]));
  const exc = prod.map((v, h) => Math.max(0, v - cons[h]));
  const imp = def.slice();
  const exp = exc.slice();
  const tr = track ? emptyTrace() : undefined;
  if (tr) { tr.prod = prod.slice(); tr.cons = cons.slice(); }
  let dis = 0, chS = 0, chG = 0;
  if (cap <= 0 || p.bKw <= 0 || (!f.self && !f.arb)) {
    return { imp, exp, dis, chSolar: 0, chGrid: 0, trace: tr };
  }
  const kw = p.bKw, rte = p.rte;
  const isPuant = (h: number) => p.tariff === 'uc' && zoneOf(h) === 'puant';

  // Puant saatlerinde karşılanabilecek açık (deşarj gücüyle sınırlı)
  let puantNeed = 0;
  for (let h = 0; h < 24; h++) if (isPuant(h)) puantNeed += Math.min(def[h], kw);
  // Güneşten beklenen şarj
  let solarAvail = 0;
  if (f.self) { for (let h = 0; h < 24; h++) solarAvail += Math.min(exc[h], kw); solarAvail = Math.min(solarAvail, cap); }
  // Gece şebekeden şarj: puant ihtiyacının güneşle karşılanamayan kısmı
  let gridPlan = f.arb ? Math.max(0, Math.min(cap, puantNeed / rte) - solarAvail) : 0;

  let soc = 0;
  let puantLeft = puantNeed;
  for (let h = 0; h < 24; h++) {
    if (gridPlan > 0 && h < 6) {
      const c = Math.min(kw, gridPlan, cap - soc);
      soc += c; gridPlan -= c; chG += c; imp[h] += c;
      if (tr) tr.chGrid[h] = c;
    }
    if (f.self && exp[h] > 0 && soc < cap) {
      const c = Math.min(exp[h], kw, cap - soc);
      soc += c; exp[h] -= c; chS += c;
      if (tr) tr.chSolar[h] = c;
    }
    if (def[h] > 0 && soc > 0) {
      // Üç zamanlı tarifede sabah gece dilimi (00–06) en ucuz saattir: burada deşarj etmek
      // gece şarjını boşa harcar. Puanttan artan enerji yalnızca 22–24 arasında kullanılır.
      let allow = !(p.tariff === 'uc' && h < 6);
      let limit = Infinity;
      if (p.tariff === 'uc' && f.arb && !isPuant(h) && zoneOf(h) === 'gunduz') {
        // Puant için gereken enerjiyi sakla; yalnızca fazlası gündüz kullanılabilir
        limit = Math.max(0, soc * rte - puantLeft);
        allow = limit > 0;
      }
      if (allow) {
        const d = Math.min(def[h], kw, soc * rte, limit);
        soc -= d / rte; imp[h] -= d; dis += d;
        if (isPuant(h)) puantLeft = Math.max(0, puantLeft - d);
        if (tr) tr.dis[h] = d;
      }
    }
    if (tr) tr.soc[h] = soc;
  }
  return { imp, exp, dis, chSolar: chS, chGrid: chG, trace: tr };
}

interface YearOut { billTL: number; dis: number; chSolar: number; chGrid: number }

/** Yıllık fatura (TL, 1. yıl fiyatlarıyla). Saatlik (C&I) veya aylık (mesken) mahsuplaşma. */
function yearBill(p: P, yr: number, cap: number, f: Flags): YearOut {
  const pvScale = Math.pow(1 - p.pvDegr, yr - 1);
  let impCost = 0, expKwh = 0, dis = 0, chS = 0, chG = 0;
  let meskenBill = 0;
  for (let mi = 0; mi < 12; mi++) {
    const days = calDays(mi);
    let mImpKwh = 0, mImpCost = 0, mExp = 0;
    for (const dt of ['wd', 'we'] as const) {
      const n = days[dt];
      const r = dispatchDay(p, pvDay(p.kwp, p.spec, p.orient, mi, pvScale), dayCons(p, mi, dt), cap, f, false);
      for (let h = 0; h < 24; h++) {
        mImpKwh += r.imp[h] * n;
        mImpCost += r.imp[h] * p.price[h] * n;
        mExp += r.exp[h] * n;
      }
      dis += r.dis * n; chS += r.chSolar * n; chG += r.chGrid * n;
    }
    if (p.abone === 'mesken') {
      // Aylık mahsup: ay içindeki veriş, çekişten düşülür; kalan fazla satış fiyatından
      const avgBuy = mImpKwh > 0 ? mImpCost / mImpKwh : p.price[12];
      const net = mImpKwh - mExp;
      meskenBill += net >= 0 ? net * avgBuy : net * p.pSell;
    } else {
      impCost += mImpCost;
      expKwh += mExp;
    }
  }
  if (p.abone === 'mesken') return { billTL: meskenBill, dis, chSolar: chS, chGrid: chG };
  // Saatlik rejim: ihtiyaç fazlası bedelli satış limiti ≈ 2 × yıllık tüketim
  const paidExp = Math.min(expKwh, 2 * p.consY);
  return { billTL: impCost - paidExp * p.pSell, dis, chSolar: chS, chGrid: chG };
}

function capOf(p: P, yr: number): number {
  const age = p.augYear > 0 && yr >= p.augYear ? yr - p.augYear : yr - 1;
  return p.bKwh * p.dod * Math.pow(1 - p.bDegr, age);
}

export function computeBessCi(inputs: BessCiInputs): BessCiModel {
  const p = normalizeBessCi(inputs);
  const warnings: string[] = [];
  if (inputs.useArb && p.tariff !== 'uc') warnings.push('Tarife arbitrajı yalnızca üç zamanlı tarifede çalışır; tek zamanlı tarifede devre dışı bırakıldı.');
  if (inputs.usePeak && inputs.abone === 'mesken') warnings.push('Meskende güç bedeli yoktur; zirve tıraşlama devre dışı bırakıldı.');
  if (p.abone === 'mesken' && p.useSelf) warnings.push('Meskende aylık mahsuplaşma sürdüğü için güneş fazlasını kaydırmak faturayı neredeyse değiştirmez; verim kaybı nedeniyle küçük bir zarar bile çıkabilir.');
  if (p.bKw > 0 && p.bKwh / p.bKw < 1) warnings.push('Batarya süresi 1 saatin altında; akşam puantını karşılamak için genellikle 2–4 saat (kWh/kW) gerekir.');

  const flags: Flags = { self: p.useSelf, arb: p.useArb };
  const capex = p.bKwh * p.capexKwh + p.bKw * p.capexKw;
  const soh = sohCheck(p.life, p.bDegr, p.augYear, p.sohReqs);
  if (!soh.ok) warnings.push(`Kapasite sağlığı şartı sağlanmıyor: yıllık %${(p.bDegr * 100).toFixed(1)} kayıpla kontrol noktalarında eşiğin altına düşülüyor. Şartı yenilemesiz sağlamak için yıllık kayıp en fazla %${(soh.maxDegr * 100).toFixed(2)} olmalı — garantili ürün seçin, kapasite fazlası kurun ya da hücre yenilemesi planlayın.`);

  const reserveFor = (cap: number) => {
    const backup = p.useBackup ? cap * p.backupReserve : 0;
    const peakCut = p.usePeak ? Math.min(p.peakCutKw, p.bKw, Math.max(0, cap - backup) / p.peakHours) : 0;
    const peakRes = peakCut * p.peakHours;
    return { backup, peakCut, op: Math.max(0, cap - backup - peakRes) };
  };

  const years: BessCiYear[] = [];
  let cum = -capex;
  const disArr: number[] = [];
  const costArr: number[] = [];
  let y1: BessCiBreak = { self: 0, arb: 0, peak: 0, backup: 0 };
  let y1Stats = { disKwh: 0, chSolar: 0, chGrid: 0, cycles: 0, baseBillTL: 0, bessBillTL: 0, peakCutKw: 0, backupCoverage: 0 };

  for (let y = 1; y <= p.life; y++) {
    const cap = capOf(p, y);
    const res = reserveFor(cap);
    const base = yearBill(p, y, 0, flags);
    const withB = yearBill(p, y, res.op, flags);
    const energyTL = base.billTL - withB.billTL;
    const peakTL = res.peakCut * p.demandFee * 12;
    const coverage = p.useBackup ? Math.min(1, res.backup / (p.criticalKw * p.eventH)) * Math.min(1, p.bKw / p.criticalKw) : 0;
    const backupTL = p.outageH * p.outageCost * coverage;

    const tl = Math.pow(1 + p.tlEsc, y - 1);
    const fx = p.fx0 * Math.pow(1 + p.fxEsc, y - 1);
    const savingUsd = ((energyTL + peakTL + backupTL) * tl) / fx;
    const opexUsd = capex * p.opexPct;
    const augUsd = p.augYear > 0 && y === p.augYear ? p.bKwh * p.augCost : 0;
    const cfUsd = savingUsd - opexUsd - augUsd;
    cum += cfUsd;
    years.push({ y, capKwh: cap, energyTL, peakTL, backupTL, savingUsd, opexUsd, augUsd, cfUsd, cumUsd: cum, disKwh: withB.dis });
    disArr.push(withB.dis);
    costArr.push(opexUsd + augUsd);

    if (y === 1) {
      // Kırılım: önce yalnız "self", sonra "arb" katkısı
      let self = 0, arb = 0;
      if (p.useSelf && p.useArb) {
        const selfOnly = base.billTL - yearBill(p, 1, res.op, { self: true, arb: false }).billTL;
        self = selfOnly; arb = energyTL - selfOnly;
      } else if (p.useSelf) self = energyTL;
      else if (p.useArb) arb = energyTL;
      y1 = { self, arb, peak: peakTL, backup: backupTL };
      y1Stats = {
        disKwh: withB.dis, chSolar: withB.chSolar, chGrid: withB.chGrid,
        cycles: res.op > 0 ? (withB.chSolar + withB.chGrid) / res.op : 0,
        baseBillTL: base.billTL, bessBillTL: withB.billTL, peakCutKw: res.peakCut, backupCoverage: coverage,
      };
    }
  }

  const cfs = years.map((r) => r.cfUsd);
  const pvDis = pvSum(disArr, p.disc);
  const lcos = pvDis > 0 ? (capex + pvSum(costArr, p.disc)) / pvDis : NaN;

  const op1 = reserveFor(capOf(p, 1)).op;
  const trace = (mi: number) => dispatchDay(p, pvDay(p.kwp, p.spec, p.orient, mi), dayCons(p, mi, 'wd'), op1, flags, true).trace!;

  return {
    capex, bKw: p.bKw, soh, years,
    npv: npvOf(capex, cfs, p.disc), irr: irrOf(capex, cfs), payback: paybackOf(capex, cfs), lcos,
    y1, y1Stats, summer: trace(6), winter: trace(0), warnings,
  };
}

export const BESS_CI_MONTHS = MONTHS;
export const BESS_CI_DAYS = DAYS;
