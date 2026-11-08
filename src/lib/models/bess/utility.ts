// Utility — mevcut lisanslı GES santraline sonradan batarya ekleme fizibilitesi
// (üretim tesisine bütünleşik depolama).
//
// Mevzuat çerçevesi:
//  - Santralin şebekeye saatlik verişi lisanstaki kurulu güçle (AC) sınırlı kalır.
//  - YEKDEM'li santralde fiyat her saat aynıdır → zaman kaydırma tek başına kazanç getirmez.
//    Kazanç, aksi halde kaybolacak enerjiden (inverter kırpması / şebeke kısıntısı) gelir.
//    Şebekeden çekilip depolanan enerji YEKDEM dışında sayılır → model şebekeden şarj etmez.
//  - YEKDEM süresi bitince (veya YEKDEM'siz santralde) PTF farkından arbitraj yapılabilir.
//  - Yan hizmet (PFK/SFK): bataryanın bir kısmı (MW) rezerv olarak ayrılır, kapasite bedeli alınır.
//    Katılım şartları/TEİAŞ onayı belirsizdir → kullanıcı açıkça seçer.
//  - Dengesizlik: tahmin sapmasının bir kısmı batarya ile kapatılır.

import { DAYS } from '@/lib/models/ci/presets';
import { clamp, emptyTrace, irrOf, npvOf, paybackOf, pvDay, pvSum, sohCheck, sohReqsOf, type DayTrace, type SohCheck, type SohReq } from './common';

export interface BessUtilityInputs {
  pname: string; firm?: string; loc?: string; prep: string;
  // Mevcut santral
  dcMwp: number; acMw: number; spec: number; pvDegr: number; clipPct: number; curtPct: number;
  // Gelir rejimi
  regime: 'yekdem' | 'merchant';
  yekdemPrice: number; yekdemYears: number;
  // PTF profili (TL/MWh, 1. yıl)
  ptfNoon: number; ptfDay: number; ptfPeak: number; ptfNight: number;
  // Kullanım senaryoları
  useClip: boolean; useArb: boolean; useAnc: boolean; useImb: boolean;
  // Yan hizmet
  ancType: 'pfk' | 'sfk'; ancMw: number; ancPrice: number; ancAvail: number; ancHours: number; ancEsc: number;
  // Dengesizlik
  devPct: number; imbCost: number; imbReduce: number;
  // Batarya
  bMw: number; bMwh: number; rte: number; dod: number; bDegr: number; life: number;
  capexKwh: number; opexPct: number; augYear: number; augCost: number;
  /** C-oranı (MW = MWh × C). 0 → güç elle girilir */
  cRate: number;
  /** Güç dönüştürücü (PCS/inverter) maliyeti ($/kW) — C-oranının ekonomik etkisi buradan gelir */
  capexKw: number;
  /** Kapasite sağlığı şartı: sohY1. yıl sonunda en az %sohP1 (ikinci kontrol noktası da aynı) */
  sohY1: number; sohP1: number; sohY2: number; sohP2: number;
  // Finans
  fx0: number; tlEsc: number; fxEsc: number; disc: number;
}

export interface BessUtilityYear {
  y: number; capMwh: number; yekdem: boolean;
  clipUsd: number; arbUsd: number; ancUsd: number; imbUsd: number;
  revUsd: number; opexUsd: number; augUsd: number; cfUsd: number; cumUsd: number;
  disMwh: number;
}

export interface BessUtilityModel {
  capex: number;
  /** Etkin güç (MW) — C-oranından türetilir */
  bMw: number;
  soh: SohCheck;
  years: BessUtilityYear[];
  npv: number; irr: number; payback: number; lcos: number;
  y1Stats: { clipMwh: number; curtMwh: number; recoveredMwh: number; arbMwh: number; disMwh: number; cycles: number; pvMwh: number; arbMw: number; ancMw: number };
  summer: DayTrace; winter: DayTrace;
  warnings: string[];
}

interface P {
  dcMwp: number; acMw: number; spec: number; pvDegr: number; clipPct: number; curtPct: number;
  regime: 'yekdem' | 'merchant'; yekdemPrice: number; yekdemYears: number;
  ptf: number[];
  useClip: boolean; useArb: boolean; useAnc: boolean; useImb: boolean;
  ancMw: number; ancPrice: number; ancAvail: number; ancHours: number; ancEsc: number;
  devPct: number; imbCost: number; imbReduce: number;
  bMw: number; bMwh: number; rte: number; dod: number; bDegr: number; life: number;
  capexKwh: number; opexPct: number; augYear: number; augCost: number;
  capexKw: number; sohReqs: SohReq[];
  fx0: number; tlEsc: number; fxEsc: number; disc: number;
}

/** Saatlik PTF eğrisi: öğle çukuru 11–15, gündüz 06–10 & 16, puant 17–21, gece 22–05. */
export function ptfCurve(noon: number, day: number, peak: number, night: number): number[] {
  return Array.from({ length: 24 }, (_, h) => (h >= 11 && h <= 15 ? noon : h >= 6 && h <= 16 ? day : h >= 17 && h <= 21 ? peak : night));
}

export function normalizeBessUtility(i: BessUtilityInputs): P {
  const bMw = (i.cRate ?? 0) > 0 ? clamp(i.bMwh, 0, 1e6) * clamp(i.cRate, 0.05, 4) : clamp(i.bMw, 0, 1e5);
  return {
    dcMwp: clamp(i.dcMwp, 0, 1e5), acMw: clamp(i.acMw, 0.01, 1e5), spec: clamp(i.spec, 500, 2800), pvDegr: clamp(i.pvDegr, 0, 5) / 100,
    clipPct: clamp(i.clipPct, 0, 30) / 100, curtPct: clamp(i.curtPct, 0, 100) / 100,
    regime: i.regime === 'merchant' ? 'merchant' : 'yekdem', yekdemPrice: clamp(i.yekdemPrice, 0, 1e4), yekdemYears: Math.round(clamp(i.yekdemYears, 0, 30)),
    ptf: ptfCurve(clamp(i.ptfNoon, 0, 1e6), clamp(i.ptfDay, 0, 1e6), clamp(i.ptfPeak, 0, 1e6), clamp(i.ptfNight, 0, 1e6)),
    useClip: !!i.useClip, useArb: !!i.useArb, useAnc: !!i.useAnc, useImb: !!i.useImb,
    ancMw: i.useAnc ? clamp(i.ancMw, 0, bMw) : 0, ancPrice: clamp(i.ancPrice, 0, 1e6), ancAvail: clamp(i.ancAvail, 0, 100) / 100, ancHours: clamp(i.ancHours, 0, 24), ancEsc: clamp(i.ancEsc ?? 0, -50, 300) / 100,
    devPct: clamp(i.devPct, 0, 100) / 100, imbCost: clamp(i.imbCost, 0, 1e6), imbReduce: clamp(i.imbReduce, 0, 100) / 100,
    bMw, bMwh: clamp(i.bMwh, 0, 1e6), rte: clamp(i.rte, 50, 100) / 100, dod: clamp(i.dod, 50, 100) / 100, bDegr: clamp(i.bDegr, 0, 10) / 100,
    life: Math.round(clamp(i.life, 3, 30)),
    capexKwh: clamp(i.capexKwh, 0, 1e5), capexKw: clamp(i.capexKw ?? 0, 0, 1e5), sohReqs: sohReqsOf(i), opexPct: clamp(i.opexPct, 0, 20) / 100, augYear: Math.round(clamp(i.augYear, 0, 30)), augCost: clamp(i.augCost, 0, 1e5),
    fx0: clamp(i.fx0, 1, 1e5), tlEsc: clamp(i.tlEsc, -50, 300) / 100, fxEsc: clamp(i.fxEsc, -50, 300) / 100, disc: clamp(i.disc, 0, 60) / 100,
  };
}

const CURT_HOURS = (h: number) => h >= 10 && h <= 15;

interface DayRes {
  /** İhracat geliri (fiyat × MWh), batarya dahil */
  rev: number;
  clipMwh: number; curtMwh: number; recovered: number; arbCharged: number; dis: number;
  trace?: DayTrace;
}

/**
 * Bir temsili gün. price[h] = o saatte şebekeye verilen 1 MWh'nin geliri (YEKDEM'de sabit).
 * 1) Kırpılan / kısılan enerji (bedava) bataryaya.
 * 2) Arbitraj açıksa: en ucuz saatlerden PV ihracatı bataryaya (yalnız puant fiyatı × verim > şarj fiyatıysa).
 * 3) Deşarj: en pahalı saatlerden başlayarak, AC veriş sınırı içinde.
 */
function dispatchDay(p: P, dc: number[], cap: number, pw: number, price: number[], arb: boolean, clip: boolean, track: boolean): DayRes {
  // Ortalama gün eğrisi saatlik ortalama olduğundan AC sınırına nadiren değer; gerçek kırpma
  // açık günlerde olur. Bu yüzden kırpma, kullanıcının girdiği yıllık orana göre öğle saatlerine dağıtılır.
  const midShare = dc.reduce((s, v, h) => s + (CURT_HOURS(h) ? v : 0), 0) / Math.max(1e-9, dc.reduce((a, b) => a + b, 0));
  const k = midShare > 0 ? Math.min(0.9, p.clipPct / midShare) : 0;
  const clipped = dc.map((v, h) => (CURT_HOURS(h) ? v * k : 0));
  const ac = dc.map((v, h) => Math.min(v - clipped[h], p.acMw));
  const curt = ac.map((v, h) => (CURT_HOURS(h) ? v * p.curtPct : 0));
  const exp = ac.map((v, h) => v - curt[h]);
  const tr = track ? emptyTrace() : undefined;
  if (tr) { tr.prod = dc.slice(); tr.cons = Array(24).fill(p.acMw); }

  let soc = 0, recovered = 0, arbCh = 0, dis = 0;
  const free = clipped.map((v, h) => v + curt[h]);
  const clipMwh = clipped.reduce((a, b) => a + b, 0);
  const curtMwh = curt.reduce((a, b) => a + b, 0);

  if (cap > 0 && pw > 0) {
    const chUsed = Array(24).fill(0); // saat başına kullanılan şarj gücü
    if (clip) {
      for (let h = 0; h < 24; h++) {
        const c = Math.min(free[h], pw, cap - soc);
        if (c > 0) { soc += c; recovered += c; chUsed[h] += c; if (tr) tr.chSolar[h] += c; }
      }
    }
    // Deşarj saatleri: fiyatı yüksekten düşüğe (öğleden sonrası tercih — PV düşük, veriş payı boş)
    // Fiyat eşitse (YEKDEM) piyasa değeri yüksek akşam puantı tercih edilir — gerçekçi dağıtım
    const order = Array.from({ length: 24 }, (_, h) => h).sort((a, b) => price[b] - price[a] || p.ptf[b] - p.ptf[a] || a - b);
    if (arb && soc < cap) {
      // Arbitraj: en pahalı deşarj fiyatına göre kârlı en ucuz şarj saatlerini seç
      const bestDis = Math.max(...price);
      const chOrder = Array.from({ length: 24 }, (_, h) => h).filter((h) => exp[h] > 0).sort((a, b) => price[a] - price[b]);
      for (const h of chOrder) {
        if (soc >= cap) break;
        if (price[h] >= bestDis * p.rte) break; // kârsız
        const room = Math.min(pw - chUsed[h], cap - soc);
        const c = Math.min(exp[h], Math.max(0, room));
        if (c > 0) { soc += c; exp[h] -= c; arbCh += c; chUsed[h] += c; if (tr) tr.chGrid[h] += c; }
      }
    }
    for (const h of order) {
      if (soc <= 0) break;
      const head = p.acMw - exp[h]; // veriş sınırında kalan boşluk
      const d = Math.min(pw, soc * p.rte, Math.max(0, head));
      if (d > 0) { soc -= d / p.rte; exp[h] += d; dis += d; if (tr) tr.dis[h] = d; }
    }
  }
  if (tr) { let s = 0; for (let h = 0; h < 24; h++) { s += tr.chSolar[h] + tr.chGrid[h] - tr.dis[h] / p.rte; tr.soc[h] = Math.max(0, s); } }
  const rev = exp.reduce((s, v, h) => s + v * price[h], 0);
  return { rev, clipMwh, curtMwh, recovered, arbCharged: arbCh, dis, trace: tr };
}

function capOf(p: P, yr: number): number {
  const age = p.augYear > 0 && yr >= p.augYear ? yr - p.augYear : yr - 1;
  return p.bMwh * p.dod * Math.pow(1 - p.bDegr, age);
}

export function computeBessUtility(inputs: BessUtilityInputs): BessUtilityModel {
  const p = normalizeBessUtility(inputs);
  const warnings: string[] = [];
  const yekdemAll = p.regime === 'yekdem' && p.yekdemYears >= p.life;
  if (p.useArb && yekdemAll) warnings.push('YEKDEM süresi analiz süresini kapsıyor: YEKDEM fiyatı her saat aynı olduğundan arbitraj kazancı sıfır çıkar.');
  if (p.useClip && p.clipPct === 0 && p.curtPct === 0) warnings.push('Kırpma ve kısıntı oranı %0: kurtarılacak enerji yok. PVsyst raporundaki inverter kırpma kaybını ve kısıntı varsayımını girin.');
  if (p.useAnc) warnings.push('Yan hizmet geliri iyimser senaryodur: santral içi bataryanın PFK/SFK\'ya katılımı TEİAŞ testleri ve anlaşmasına bağlıdır; saatlik teklif usulü 1 Ocak 2027\'de başlar.');
  if (p.useAnc && p.ancMw >= p.bMw && p.bMw > 0) warnings.push('Bataryanın tamamı yan hizmete ayrıldı; arbitraj ve kırpma kurtarma için güç kalmadı.');

  const capex = p.bMwh * 1000 * p.capexKwh + p.bMw * 1000 * p.capexKw;
  const soh = sohCheck(p.life, p.bDegr, p.augYear, p.sohReqs);
  if (!soh.ok) warnings.push(`Kapasite sağlığı şartı sağlanmıyor: yıllık %${(p.bDegr * 100).toFixed(1)} kayıpla kontrol noktalarında eşiğin altına düşülüyor. Şartı yenilemesiz sağlamak için yıllık kayıp en fazla %${(soh.maxDegr * 100).toFixed(2)} olmalı — garantili ürün seçin, kapasite fazlası kurun ya da hücre yenilemesi planlayın.`);
  const pw = Math.max(0, p.bMw - p.ancMw);

  const years: BessUtilityYear[] = [];
  const disArr: number[] = [];
  const costArr: number[] = [];
  let cum = -capex;
  let y1Stats = { clipMwh: 0, curtMwh: 0, recoveredMwh: 0, arbMwh: 0, disMwh: 0, cycles: 0, pvMwh: 0, arbMw: pw, ancMw: p.ancMw };

  for (let y = 1; y <= p.life; y++) {
    const tl = Math.pow(1 + p.tlEsc, y - 1);
    const fx = p.fx0 * Math.pow(1 + p.fxEsc, y - 1);
    const yekdem = p.regime === 'yekdem' && y <= p.yekdemYears;
    // Saatlik gelir fiyatı ($/MWh)
    const price = yekdem ? Array(24).fill(p.yekdemPrice) : p.ptf.map((v) => (v * tl) / fx);
    const cap = Math.max(0, capOf(p, y) - p.ancMw * p.ancHours);
    const pvScale = Math.pow(1 - p.pvDegr, y - 1);
    const arbOn = p.useArb && !yekdem;

    let revBase = 0, revClip = 0, revAll = 0, dis = 0, clipMwh = 0, curtMwh = 0, rec = 0, arbMwh = 0, pvMwh = 0;
    for (let mi = 0; mi < 12; mi++) {
      const n = DAYS[mi];
      const dc = pvDay(p.dcMwp * 1000, p.spec, 's', mi, pvScale).map((v) => v / 1000); // MWh
      const base = dispatchDay(p, dc, 0, 0, price, false, false, false);
      const cOnly = p.useClip ? dispatchDay(p, dc, cap, pw, price, false, true, false) : base;
      const all = arbOn ? dispatchDay(p, dc, cap, pw, price, true, p.useClip, false) : cOnly;
      revBase += base.rev * n; revClip += cOnly.rev * n; revAll += all.rev * n;
      dis += all.dis * n; clipMwh += base.clipMwh * n; curtMwh += base.curtMwh * n; rec += all.recovered * n; arbMwh += all.arbCharged * n;
      pvMwh += dc.reduce((a, b) => a + b, 0) * n;
    }
    const clipUsd = revClip - revBase;
    const arbUsd = revAll - revClip;
    // Yan hizmet fiyatı TL enflasyonuyla otomatik artmaz: kullanıcının girdiği yıllık değişimle ilerler
    const ancUsd = p.useAnc ? (p.ancMw * p.ancPrice * 8760 * p.ancAvail * Math.pow(1 + p.ancEsc, y - 1)) / fx : 0;
    const imbUsd = p.useImb ? (pvMwh * p.devPct * p.imbCost * p.imbReduce * tl) / fx : 0;
    const revUsd = clipUsd + arbUsd + ancUsd + imbUsd;
    const opexUsd = capex * p.opexPct;
    const augUsd = p.augYear > 0 && y === p.augYear ? p.bMwh * 1000 * p.augCost : 0;
    const cfUsd = revUsd - opexUsd - augUsd;
    cum += cfUsd;
    years.push({ y, capMwh: cap, yekdem, clipUsd, arbUsd, ancUsd, imbUsd, revUsd, opexUsd, augUsd, cfUsd, cumUsd: cum, disMwh: dis });
    disArr.push(dis);
    costArr.push(opexUsd + augUsd);
    if (y === 1) y1Stats = { clipMwh, curtMwh, recoveredMwh: rec, arbMwh, disMwh: dis, cycles: cap > 0 ? (rec + arbMwh) / cap : 0, pvMwh, arbMw: pw, ancMw: p.ancMw };
  }

  const y1r = years[0];
  if (y1r && p.useAnc && y1r.revUsd > 0 && y1r.ancUsd / y1r.revUsd > 0.5) {
    warnings.push(`Sonucun büyük kısmı (1. yıl gelirin %${Math.round((y1r.ancUsd / y1r.revUsd) * 100)}'i) yan hizmet varsayımına dayanıyor. Yan hizmet pazarı sınırlıdır; TEİAŞ en düşük tekliften alır ve depolama tesisleri girdikçe fiyatların düşmesi beklenir. Güncel fiyatı EPİAŞ Şeffaflık Platformu'ndan doğrulayın ve yan hizmetsiz sonuca da bakın.`);
  }

  const cfs = years.map((r) => r.cfUsd);
  const pvDis = pvSum(disArr, p.disc);
  const lcos = pvDis > 0 ? (capex + pvSum(costArr, p.disc)) / pvDis : NaN; // $/MWh

  const trace = (mi: number) => {
    const yekdem = p.regime === 'yekdem' && p.yekdemYears >= 1;
    const price = yekdem ? Array(24).fill(p.yekdemPrice) : p.ptf.map((v) => v / p.fx0);
    const dc = pvDay(p.dcMwp * 1000, p.spec, 's', mi).map((v) => v / 1000);
    return dispatchDay(p, dc, Math.max(0, capOf(p, 1) - p.ancMw * p.ancHours), pw, price, p.useArb && !yekdem, p.useClip, true).trace!;
  };

  return {
    capex, bMw: p.bMw, soh, years,
    npv: npvOf(capex, cfs, p.disc), irr: irrOf(capex, cfs), payback: paybackOf(capex, cfs), lcos,
    y1Stats, summer: trace(6), winter: trace(0), warnings,
  };
}
